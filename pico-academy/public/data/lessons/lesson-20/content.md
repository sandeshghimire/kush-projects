# Putting It All Together — Architecture of a Robot

## What you'll learn
- How to design the full software architecture of a robot
- How to use state machines to manage robot behavior
- How to schedule tasks with different priorities and timing
- How to organize modules for sensors, motors, and communication
- How sensor fusion combines multiple data sources

## Parts you'll need
- All parts from previous lessons assembled on your robot chassis

## Background

Building a robot isn't just about connecting wires and writing code for each sensor separately. The real challenge is making everything work **together** smoothly. Think of it like building a team of players — each person is great on their own, but they need a coach to coordinate them.

A **state machine** is that coach. Your robot can be in different "states" — like IDLE, LINE_FOLLOWING, OBSTACLE_AVOIDING, or REMOTE_CONTROL. In each state, the robot behaves differently: reading certain sensors, ignoring others, moving in certain ways. The state machine decides when to switch between states based on sensor input or user commands.

**Task scheduling** is how you manage timing. Some tasks need to run very fast (motor control at 1000 Hz), others are medium speed (sensor reading at 50 Hz), and some are slow (display updates at 10 Hz). You can't do everything every loop iteration — you need a **scheduler** that runs each task at its correct rate.

**Sensor fusion** means combining data from multiple sensors for better results than any single sensor alone. For example: wheel encoders tell you how far you've driven, but they drift over time. The IMU tells you your heading, but it also drifts. Combining them with a filter gives you much better position tracking than either alone!

The key principle is **modularity** — each subsystem (motors, sensors, display, communication) lives in its own `.c`/`.h` file with a clean interface. The main loop just coordinates them.

## Wiring

This lesson uses all the components assembled on your robot chassis from the project modules.

## The code

```c
#include "pico/stdlib.h"
#include "pico/multicore.h"
#include "hardware/timer.h"
#include <stdio.h>
#include <stdbool.h>

// --- Robot States ---
typedef enum {
    STATE_IDLE,
    STATE_LINE_FOLLOW,
    STATE_OBSTACLE_AVOID,
    STATE_REMOTE_CONTROL,
    STATE_EMERGENCY_STOP
} RobotState;

static volatile RobotState current_state = STATE_IDLE;

// --- Timing ---
#define MOTOR_INTERVAL_US    1000   // 1000 Hz motor control
#define SENSOR_INTERVAL_US   20000  // 50 Hz sensor reading
#define DISPLAY_INTERVAL_US  100000 // 10 Hz display update
#define BATTERY_INTERVAL_US  5000000 // 0.2 Hz battery check

static uint64_t last_motor_time = 0;
static uint64_t last_sensor_time = 0;
static uint64_t last_display_time = 0;
static uint64_t last_battery_time = 0;

// --- Sensor Data (shared, updated atomically) ---
typedef struct {
    float distance_cm;
    float line_position;
    float heading_deg;
    float speed_left;
    float speed_right;
    float battery_voltage;
} SensorData;

static volatile SensorData sensors = {0};

// --- Motor Commands ---
typedef struct {
    int left_speed;   // -100 to +100
    int right_speed;  // -100 to +100
} MotorCommand;

// Placeholder module functions — replace with real implementations
void motors_init(void) { printf("Motors initialized\n"); }
void motors_set(MotorCommand cmd) { /* set motor speeds */ }
void motors_stop(void) { motors_set((MotorCommand){0, 0}); }

float sensor_read_distance(void) { return 50.0f; }
float sensor_read_line(void) { return 0.0f; }
float sensor_read_heading(void) { return 0.0f; }
float sensor_read_battery(void) { return 5.5f; }

void display_update(RobotState state, SensorData *s) {
    // Update OLED with current state and readings
}

// --- State Machine Logic ---
MotorCommand state_idle(SensorData *s) {
    return (MotorCommand){0, 0};
}

MotorCommand state_line_follow(SensorData *s) {
    // PID controller based on line position
    float error = s->line_position;
    int base_speed = 60;
    int correction = (int)(error * 30.0f);  // Proportional control
    return (MotorCommand){
        base_speed - correction,
        base_speed + correction
    };
}

MotorCommand state_obstacle_avoid(SensorData *s) {
    if (s->distance_cm < 15.0f) {
        // Too close — turn right
        return (MotorCommand){50, -50};
    } else if (s->distance_cm < 30.0f) {
        // Getting close — veer right
        return (MotorCommand){60, 30};
    }
    // Clear ahead — go forward
    return (MotorCommand){70, 70};
}

MotorCommand state_remote_control(SensorData *s) {
    // Read commands from Wi-Fi/Bluetooth
    return (MotorCommand){0, 0};
}

MotorCommand run_state_machine(SensorData *s) {
    // Check for emergency conditions first
    if (s->battery_voltage < 4.0f) {
        current_state = STATE_EMERGENCY_STOP;
    }
    if (s->distance_cm < 5.0f && current_state != STATE_REMOTE_CONTROL) {
        current_state = STATE_EMERGENCY_STOP;
    }

    switch (current_state) {
        case STATE_IDLE:            return state_idle(s);
        case STATE_LINE_FOLLOW:     return state_line_follow(s);
        case STATE_OBSTACLE_AVOID:  return state_obstacle_avoid(s);
        case STATE_REMOTE_CONTROL:  return state_remote_control(s);
        case STATE_EMERGENCY_STOP:
            motors_stop();
            return (MotorCommand){0, 0};
        default:
            return (MotorCommand){0, 0};
    }
}

// --- Core 1: Display and Communication ---
void core1_main(void) {
    while (true) {
        SensorData s = sensors;  // Copy volatile data
        display_update(current_state, &s);
        sleep_ms(100);
    }
}

// --- Core 0: Main Control Loop ---
int main() {
    stdio_init_all();
    motors_init();

    multicore_launch_core1(core1_main);

    printf("Robot architecture started\n");
    printf("State: IDLE\n");

    while (true) {
        uint64_t now = time_us_64();

        // --- 1000 Hz: Motor control ---
        if (now - last_motor_time >= MOTOR_INTERVAL_US) {
            last_motor_time = now;
            SensorData s = sensors;
            MotorCommand cmd = run_state_machine(&s);
            motors_set(cmd);
        }

        // --- 50 Hz: Sensor reading ---
        if (now - last_sensor_time >= SENSOR_INTERVAL_US) {
            last_sensor_time = now;
            sensors.distance_cm = sensor_read_distance();
            sensors.line_position = sensor_read_line();
            sensors.heading_deg = sensor_read_heading();
        }

        // --- 0.2 Hz: Battery check ---
        if (now - last_battery_time >= BATTERY_INTERVAL_US) {
            last_battery_time = now;
            sensors.battery_voltage = sensor_read_battery();
        }

        tight_loop_contents();
    }

    return 0;
}
```

### How the code works

1. **State machine**: `run_state_machine()` looks at the current state and sensor data, then returns motor commands. Emergency conditions override any state.
2. **Task scheduler**: Each task has an interval. The main loop checks timestamps and runs each task at the right frequency — motor control 1000×/sec, sensors 50×/sec, etc.
3. **Multicore split**: Core 0 handles real-time control (motors + sensors). Core 1 handles display and communication (slower, less time-critical).
4. **Module pattern**: Each subsystem (motors, sensors, display) would be in its own `.c`/`.h` files with clean interfaces.
5. **Emergency stop**: Battery depletion or imminent collision triggers an emergency stop that overrides all other states.

## Try it

1. **Mode button** — Add a physical button that cycles through states: IDLE → LINE_FOLLOW → OBSTACLE_AVOID → IDLE.
2. **Logging** — Print state transitions and sensor data over serial for debugging.
3. **Smooth transitions** — Instead of instantly switching motor commands between states, ramp speeds over 200ms.

## Challenge

Implement a simple **waypoint navigator**: define a list of (distance, angle) waypoints. The robot drives to each one using encoder odometry and IMU heading, then moves to the next. Handle obstacle detection as an interrupting state that resumes navigation after clearing the obstacle.

## Summary

A robot's software architecture ties everything together: a **state machine** manages behavior modes, a **task scheduler** runs each subsystem at the right frequency, and **sensor fusion** combines multiple data sources for better accuracy. Splitting real-time control and display across two cores keeps everything responsive. Clean module boundaries let you develop and test each part independently. This architecture scales from a simple line-follower to a fully autonomous robot!
