# Missions! Full Autonomy & Integration

## What you'll learn
- How to bring every subsystem together into one unified robot program
- How to design a mission system that sequences complex behaviors
- How state machines can be layered — a top-level mission manager controlling a behavior-level state machine
- How real autonomous robots break big tasks into small, manageable steps
- How to debug and tune a fully integrated autonomous system

## Parts you'll need
- No additional parts needed — this project uses everything you've already built!

## Background

This is it — the grand finale! Over the last 19 projects, you've built a robot piece by piece: motors, sensors, a brain (the Pico 2), eyes (ultrasonic + line sensors), balance (IMU), a screen (OLED), lights (Neopixels), a voice (buzzer), wireless control (Bluetooth + Wi-Fi), and a state machine to tie it all together. Now we're going to make it truly **autonomous** — the robot completes missions entirely on its own.

Think about how you complete a task like "clean your room." You don't think about it as one giant overwhelming job. You break it into steps: pick up clothes, make the bed, organize the desk, vacuum the floor. Each step is manageable, and when you finish all of them, the big task is done. Our robot does the same thing!

Each **mission** is a sequence of **actions**. An action might be "drive forward 50 cm," "turn right 90°," "follow the line until you see an obstacle," or "stop and celebrate." The mission manager steps through actions one by one, checking after each if it completed successfully. If something goes wrong (like an unexpected obstacle), the robot can handle it gracefully — stop, back up, try again, or abort.

We'll implement four missions of increasing difficulty:
1. **Drive a Square** — the classic test: four straight sides with 90° turns
2. **Follow a Line for 1 Meter** — use the line sensors to follow a track
3. **Navigate an Obstacle Course** — drive forward and dodge obstacles
4. **Line Follow + Obstacle Avoidance** — the ultimate combo: follow a line while navigating around obstacles placed on the track

This is exactly how real autonomous robots work. Self-driving cars, warehouse robots, and Mars rovers all have mission systems that break down goals into sequences of small, sensor-guided actions. You're building the same architecture!

## Wiring

Uses existing wiring from all previous projects:

| Subsystem | Pins | Project |
|-----------|------|---------|
| Left Motor | GP2 (fwd), GP3 (rev) | Project 4 |
| Right Motor | GP6 (fwd), GP7 (rev) | Project 4 |
| Ultrasonic (Trig) | GP14 | Project 5 |
| Ultrasonic (Echo) | GP15 | Project 5 |
| Line Sensor Left | GP26 (ADC0) | Project 6 |
| Line Sensor Right | GP27 (ADC1) | Project 6 |
| IMU (MPU6050) | GP4 (SDA), GP5 (SCL) | Project 11 |
| OLED Display | GP4 (SDA), GP5 (SCL) | Project 13 |
| Neopixel LEDs | GP28 | Project 14 |
| Buzzer | GP13 | Project 15 |
| Mode Button | GP9 | Project 16 |

## The code

```c
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>
#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/i2c.h"
#include "hardware/adc.h"
#include "hardware/gpio.h"

// ===== PIN DEFINITIONS =====
#define LEFT_FWD    2
#define LEFT_REV    3
#define RIGHT_FWD   6
#define RIGHT_REV   7
#define TRIG_PIN    14
#define ECHO_PIN    15
#define LINE_LEFT   26   // ADC0
#define LINE_RIGHT  27   // ADC1
#define SDA_PIN     4
#define SCL_PIN     5
#define BUZZER_PIN  13
#define BUTTON_PIN  9

#define I2C_PORT    i2c0
#define MPU6050_ADDR 0x68

// ===== ROBOT STATE =====
typedef enum {
    MODE_IDLE,
    MODE_MISSION_SELECT,
    MODE_RUNNING,
    MODE_COMPLETE,
    MODE_ERROR
} robot_mode_t;

typedef enum {
    MISSION_NONE,
    MISSION_SQUARE,
    MISSION_LINE_1M,
    MISSION_OBSTACLE_COURSE,
    MISSION_LINE_AND_AVOID,
    MISSION_COUNT
} mission_id_t;

static const char *mission_names[] = {
    "NONE",
    "DRIVE SQUARE",
    "LINE 1M",
    "OBSTACLE RUN",
    "LINE+AVOID"
};

typedef enum {
    ACTION_DRIVE_STRAIGHT,
    ACTION_TURN,
    ACTION_LINE_FOLLOW,
    ACTION_OBSTACLE_AVOID,
    ACTION_LINE_AVOID_COMBO,
    ACTION_STOP,
    ACTION_CELEBRATE,
    ACTION_DONE
} action_type_t;

typedef struct {
    action_type_t type;
    float param1;    // distance_cm, angle_deg, or duration_ms
    float param2;    // speed, or secondary param
} action_t;

static robot_mode_t robot_mode = MODE_IDLE;
static mission_id_t current_mission = MISSION_NONE;
static int action_index = 0;
static float heading = 0.0f;
static int16_t gyro_offset_z = 0;

// ===== MOTOR CONTROL =====
void setup_motor_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 999);
    pwm_set_enabled(slice, true);
}

void set_motor(uint fwd, uint rev, float speed) {
    uint16_t duty = (uint16_t)(fabsf(speed) * 999);
    if (speed >= 0) {
        pwm_set_gpio_level(fwd, duty);
        pwm_set_gpio_level(rev, 0);
    } else {
        pwm_set_gpio_level(fwd, 0);
        pwm_set_gpio_level(rev, duty);
    }
}

void motors_stop(void) {
    set_motor(LEFT_FWD, LEFT_REV, 0);
    set_motor(RIGHT_FWD, RIGHT_REV, 0);
}

// ===== IMU =====
static void mpu_write(uint8_t reg, uint8_t val) {
    uint8_t buf[2] = {reg, val};
    i2c_write_blocking(I2C_PORT, MPU6050_ADDR, buf, 2, false);
}

static void mpu_read(uint8_t reg, uint8_t *buf, size_t len) {
    i2c_write_blocking(I2C_PORT, MPU6050_ADDR, &reg, 1, true);
    i2c_read_blocking(I2C_PORT, MPU6050_ADDR, buf, len, false);
}

void imu_init(void) {
    mpu_write(0x6B, 0x00);
    sleep_ms(100);
}

void calibrate_gyro(void) {
    int32_t sum = 0;
    for (int i = 0; i < 200; i++) {
        uint8_t buf[6];
        mpu_read(0x43, buf, 6);
        sum += (int16_t)((buf[4] << 8) | buf[5]);
        sleep_ms(5);
    }
    gyro_offset_z = (int16_t)(sum / 200);
}

float read_gyro_z(void) {
    uint8_t buf[6];
    mpu_read(0x43, buf, 6);
    int16_t gz = (int16_t)((buf[4] << 8) | buf[5]) - gyro_offset_z;
    return gz / 131.0f;
}

void update_heading(float dt) {
    heading += read_gyro_z() * dt;
}

// ===== ULTRASONIC =====
int read_distance_cm(void) {
    gpio_put(TRIG_PIN, 1);
    sleep_us(10);
    gpio_put(TRIG_PIN, 0);

    uint32_t start = time_us_32();
    while (gpio_get(ECHO_PIN) == 0) {
        if (time_us_32() - start > 30000) return 999;
    }
    uint32_t echo_start = time_us_32();
    while (gpio_get(ECHO_PIN) == 1) {
        if (time_us_32() - echo_start > 30000) return 999;
    }
    uint32_t echo_end = time_us_32();
    return (int)((echo_end - echo_start) * 0.0343f / 2.0f);
}

// ===== LINE SENSORS =====
void read_line_sensors(uint16_t *left, uint16_t *right) {
    adc_select_input(0);
    *left = adc_read();
    adc_select_input(1);
    *right = adc_read();
}

// ===== BUZZER =====
static uint buzzer_slice;

void buzzer_init(void) {
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    buzzer_slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    pwm_set_enabled(buzzer_slice, true);
}

void beep(uint freq, uint ms) {
    if (freq == 0) { sleep_ms(ms); return; }
    uint32_t wrap = clock_get_hz(clk_sys) / freq - 1;
    float div = 1.0f;
    while (wrap > 65535) {
        div *= 2.0f;
        wrap = (uint32_t)(clock_get_hz(clk_sys) / (freq * div)) - 1;
    }
    pwm_set_clkdiv(buzzer_slice, div);
    pwm_set_wrap(buzzer_slice, wrap);
    pwm_set_gpio_level(BUZZER_PIN, wrap / 2);
    sleep_ms(ms);
    pwm_set_gpio_level(BUZZER_PIN, 0);
}

void sfx_startup(void)   { beep(523,100); beep(659,100); beep(784,200); }
void sfx_complete(void)  { beep(392,150); beep(523,150); beep(659,150); beep(784,300); }
void sfx_error(void)     { beep(330,200); beep(262,400); }
void sfx_beep(void)      { beep(523,50); sleep_ms(20); beep(659,50); }

// ===== HEADING-CONTROLLED DRIVING =====
bool drive_straight_cm(float cm, float speed) {
    // Estimate time from speed (rough: 50% speed ≈ 15 cm/s)
    float cm_per_sec = speed * 30.0f;
    uint32_t duration_ms = (uint32_t)(cm / cm_per_sec * 1000);

    float target_heading = heading;
    float kp = 0.02f;
    uint32_t start = to_ms_since_boot(get_absolute_time());
    uint32_t last_t = start;

    while ((to_ms_since_boot(get_absolute_time()) - start) < duration_ms) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        float dt = (now - last_t) / 1000.0f;
        last_t = now;
        update_heading(dt);

        // Check for obstacles while driving
        int dist = read_distance_cm();
        if (dist < 10) {
            motors_stop();
            return false;  // blocked by obstacle
        }

        float error = heading - target_heading;
        float correction = kp * error;
        float l = speed + correction;
        float r = speed - correction;
        if (l > 1.0f) l = 1.0f; if (l < 0.0f) l = 0.0f;
        if (r > 1.0f) r = 1.0f; if (r < 0.0f) r = 0.0f;

        set_motor(LEFT_FWD, LEFT_REV, l);
        set_motor(RIGHT_FWD, RIGHT_REV, r);
        sleep_ms(10);
    }
    motors_stop();
    return true;
}

void turn_degrees(float angle) {
    float target = heading + angle;
    uint32_t last_t = to_ms_since_boot(get_absolute_time());

    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        float dt = (now - last_t) / 1000.0f;
        last_t = now;
        update_heading(dt);

        float error = target - heading;
        if (fabsf(error) < 2.0f) break;

        float speed = 0.4f;
        if (fabsf(error) < 30.0f) {
            speed = 0.4f * (fabsf(error) / 30.0f);
            if (speed < 0.15f) speed = 0.15f;
        }

        if (error > 0) {
            set_motor(LEFT_FWD, LEFT_REV, speed);
            set_motor(RIGHT_FWD, RIGHT_REV, -speed);
        } else {
            set_motor(LEFT_FWD, LEFT_REV, -speed);
            set_motor(RIGHT_FWD, RIGHT_REV, speed);
        }
        sleep_ms(10);
    }
    motors_stop();
}

// ===== LINE FOLLOWING =====
// Follow line for given duration (ms). Returns false if lost line.
bool line_follow_for(uint32_t duration_ms, float base_speed) {
    float kp = 0.0005f;
    uint32_t start = to_ms_since_boot(get_absolute_time());

    while ((to_ms_since_boot(get_absolute_time()) - start) < duration_ms) {
        uint16_t left, right;
        read_line_sensors(&left, &right);

        float error = (float)left - (float)right;
        float correction = kp * error;

        float l_speed = base_speed + correction;
        float r_speed = base_speed - correction;
        if (l_speed > 1.0f) l_speed = 1.0f; if (l_speed < 0.0f) l_speed = 0.0f;
        if (r_speed > 1.0f) r_speed = 1.0f; if (r_speed < 0.0f) r_speed = 0.0f;

        set_motor(LEFT_FWD, LEFT_REV, l_speed);
        set_motor(RIGHT_FWD, RIGHT_REV, r_speed);
        sleep_ms(10);
    }
    motors_stop();
    return true;
}

// ===== LINE FOLLOW WITH OBSTACLE AVOIDANCE =====
bool line_follow_avoid(uint32_t duration_ms, float base_speed) {
    float kp = 0.0005f;
    uint32_t start = to_ms_since_boot(get_absolute_time());

    while ((to_ms_since_boot(get_absolute_time()) - start) < duration_ms) {
        // Check for obstacle
        int dist = read_distance_cm();
        if (dist < 15) {
            printf("  Obstacle at %d cm! Avoiding...\n", dist);
            motors_stop();
            sleep_ms(200);

            // Avoidance maneuver: go around obstacle
            turn_degrees(-45.0f);          // turn left 45°
            drive_straight_cm(30.0f, 0.4f); // drive around
            turn_degrees(45.0f);           // turn right 45°
            drive_straight_cm(30.0f, 0.4f); // drive parallel
            turn_degrees(45.0f);           // turn right 45°
            drive_straight_cm(30.0f, 0.4f); // drive back to line
            turn_degrees(-45.0f);          // straighten out

            // Reset start time to extend duration
            continue;
        }

        // Normal line following
        uint16_t left, right;
        read_line_sensors(&left, &right);
        float error = (float)left - (float)right;
        float correction = kp * error;

        float l_speed = base_speed + correction;
        float r_speed = base_speed - correction;
        if (l_speed > 1.0f) l_speed = 1.0f; if (l_speed < 0.0f) l_speed = 0.0f;
        if (r_speed > 1.0f) r_speed = 1.0f; if (r_speed < 0.0f) r_speed = 0.0f;

        set_motor(LEFT_FWD, LEFT_REV, l_speed);
        set_motor(RIGHT_FWD, RIGHT_REV, r_speed);
        sleep_ms(10);
    }
    motors_stop();
    return true;
}

// ===== OBSTACLE COURSE =====
bool obstacle_course(uint32_t duration_ms) {
    uint32_t start = to_ms_since_boot(get_absolute_time());

    while ((to_ms_since_boot(get_absolute_time()) - start) < duration_ms) {
        int dist = read_distance_cm();

        if (dist < 20) {
            // Obstacle ahead — decide direction
            printf("  Obstacle at %d cm\n", dist);
            motors_stop();
            sleep_ms(200);

            // Look left by turning, checking, and deciding
            float saved_heading = heading;
            turn_degrees(-45.0f);
            int left_dist = read_distance_cm();
            turn_degrees(45.0f);  // back to center

            turn_degrees(45.0f);
            int right_dist = read_distance_cm();
            turn_degrees(-45.0f);  // back to center

            printf("  Left: %d cm, Right: %d cm\n", left_dist, right_dist);

            if (left_dist > right_dist) {
                turn_degrees(-60.0f);
            } else {
                turn_degrees(60.0f);
            }
            drive_straight_cm(25.0f, 0.4f);
        } else {
            // Clear ahead — drive forward
            set_motor(LEFT_FWD, LEFT_REV, 0.4f);
            set_motor(RIGHT_FWD, RIGHT_REV, 0.4f);
        }

        sleep_ms(10);
    }
    motors_stop();
    return true;
}

// ===== MISSION DEFINITIONS =====
// Mission 1: Drive a Square (4 sides, 40cm each, 90° turns)
#define SQUARE_ACTIONS 9
static const action_t square_mission[SQUARE_ACTIONS] = {
    {ACTION_DRIVE_STRAIGHT, 40.0f, 0.4f},
    {ACTION_TURN, 90.0f, 0},
    {ACTION_DRIVE_STRAIGHT, 40.0f, 0.4f},
    {ACTION_TURN, 90.0f, 0},
    {ACTION_DRIVE_STRAIGHT, 40.0f, 0.4f},
    {ACTION_TURN, 90.0f, 0},
    {ACTION_DRIVE_STRAIGHT, 40.0f, 0.4f},
    {ACTION_CELEBRATE, 0, 0},
    {ACTION_DONE, 0, 0},
};

// Mission 2: Follow line for ~1 meter (about 7 seconds at low speed)
#define LINE_1M_ACTIONS 3
static const action_t line_1m_mission[LINE_1M_ACTIONS] = {
    {ACTION_LINE_FOLLOW, 7000.0f, 0.35f},  // 7 sec at 35%
    {ACTION_CELEBRATE, 0, 0},
    {ACTION_DONE, 0, 0},
};

// Mission 3: Obstacle course for 30 seconds
#define OBSTACLE_ACTIONS 3
static const action_t obstacle_mission[OBSTACLE_ACTIONS] = {
    {ACTION_OBSTACLE_AVOID, 30000.0f, 0},
    {ACTION_CELEBRATE, 0, 0},
    {ACTION_DONE, 0, 0},
};

// Mission 4: Line follow with obstacle avoidance for 20 seconds
#define COMBO_ACTIONS 3
static const action_t combo_mission[COMBO_ACTIONS] = {
    {ACTION_LINE_AVOID_COMBO, 20000.0f, 0.35f},
    {ACTION_CELEBRATE, 0, 0},
    {ACTION_DONE, 0, 0},
};

const action_t *get_mission_actions(mission_id_t m, int *count) {
    switch (m) {
        case MISSION_SQUARE:
            *count = SQUARE_ACTIONS; return square_mission;
        case MISSION_LINE_1M:
            *count = LINE_1M_ACTIONS; return line_1m_mission;
        case MISSION_OBSTACLE_COURSE:
            *count = OBSTACLE_ACTIONS; return obstacle_mission;
        case MISSION_LINE_AND_AVOID:
            *count = COMBO_ACTIONS; return combo_mission;
        default:
            *count = 0; return NULL;
    }
}

// ===== MISSION RUNNER =====
void run_mission(mission_id_t mission) {
    int action_count;
    const action_t *actions = get_mission_actions(mission, &action_count);
    if (!actions) {
        printf("Invalid mission!\n");
        return;
    }

    printf("\n========================================\n");
    printf("  MISSION: %s\n", mission_names[mission]);
    printf("  Actions: %d\n", action_count);
    printf("========================================\n\n");

    sfx_beep();
    sleep_ms(500);

    bool success = true;

    for (int i = 0; i < action_count && success; i++) {
        const action_t *a = &actions[i];

        switch (a->type) {
            case ACTION_DRIVE_STRAIGHT:
                printf("[%d] Drive straight %.0f cm at %.0f%%\n",
                       i, a->param1, a->param2 * 100);
                success = drive_straight_cm(a->param1, a->param2);
                if (!success) printf("  BLOCKED by obstacle!\n");
                sleep_ms(200);
                break;

            case ACTION_TURN:
                printf("[%d] Turn %.0f degrees\n", i, a->param1);
                turn_degrees(a->param1);
                sleep_ms(200);
                break;

            case ACTION_LINE_FOLLOW:
                printf("[%d] Line follow for %.0f ms at %.0f%%\n",
                       i, a->param1, a->param2 * 100);
                success = line_follow_for((uint32_t)a->param1, a->param2);
                break;

            case ACTION_OBSTACLE_AVOID:
                printf("[%d] Obstacle course for %.0f ms\n", i, a->param1);
                success = obstacle_course((uint32_t)a->param1);
                break;

            case ACTION_LINE_AVOID_COMBO:
                printf("[%d] Line+Avoid for %.0f ms\n", i, a->param1);
                success = line_follow_avoid((uint32_t)a->param1, a->param2);
                break;

            case ACTION_STOP:
                printf("[%d] Stop\n", i);
                motors_stop();
                sleep_ms((uint32_t)a->param1);
                break;

            case ACTION_CELEBRATE:
                printf("[%d] CELEBRATION!\n", i);
                motors_stop();
                sfx_complete();
                // Spin in place for fun!
                set_motor(LEFT_FWD, LEFT_REV, 0.5f);
                set_motor(RIGHT_FWD, RIGHT_REV, -0.5f);
                sleep_ms(800);
                motors_stop();
                break;

            case ACTION_DONE:
                printf("[%d] Mission complete!\n", i);
                break;
        }
    }

    motors_stop();

    if (success) {
        printf("\n*** MISSION '%s' COMPLETED SUCCESSFULLY! ***\n\n",
               mission_names[mission]);
        robot_mode = MODE_COMPLETE;
    } else {
        printf("\n*** MISSION '%s' FAILED ***\n\n",
               mission_names[mission]);
        sfx_error();
        robot_mode = MODE_ERROR;
    }
}

// ===== BUTTON HANDLING =====
static uint32_t last_btn = 0;

bool button_pressed(void) {
    if (gpio_get(BUTTON_PIN) == 0) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        if (now - last_btn > 250) {
            last_btn = now;
            return true;
        }
    }
    return false;
}

// ===== MAIN =====
int main() {
    stdio_init_all();
    sleep_ms(2000);

    // I2C
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    // ADC for line sensors
    adc_init();
    adc_gpio_init(LINE_LEFT);
    adc_gpio_init(LINE_RIGHT);

    // Ultrasonic
    gpio_init(TRIG_PIN);
    gpio_set_dir(TRIG_PIN, GPIO_OUT);
    gpio_init(ECHO_PIN);
    gpio_set_dir(ECHO_PIN, GPIO_IN);

    // Motors
    setup_motor_pin(LEFT_FWD);
    setup_motor_pin(LEFT_REV);
    setup_motor_pin(RIGHT_FWD);
    setup_motor_pin(RIGHT_REV);

    // Button
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);

    // Buzzer
    buzzer_init();

    // IMU
    imu_init();
    printf("Calibrating IMU — hold still...\n");
    calibrate_gyro();
    printf("Calibration done!\n");

    sfx_startup();

    printf("\n===========================\n");
    printf("   PICO ROBOT v1.0\n");
    printf("===========================\n");
    printf("Press button to select mission:\n");
    printf("  1: %s\n", mission_names[MISSION_SQUARE]);
    printf("  2: %s\n", mission_names[MISSION_LINE_1M]);
    printf("  3: %s\n", mission_names[MISSION_OBSTACLE_COURSE]);
    printf("  4: %s\n", mission_names[MISSION_LINE_AND_AVOID]);
    printf("\nPress once to cycle, hold for 2s to launch.\n\n");

    mission_id_t selected_mission = MISSION_SQUARE;
    robot_mode = MODE_MISSION_SELECT;

    while (true) {
        switch (robot_mode) {
            case MODE_MISSION_SELECT: {
                if (button_pressed()) {
                    // Check for long press (launch)
                    uint32_t press_start = to_ms_since_boot(get_absolute_time());
                    while (gpio_get(BUTTON_PIN) == 0) {
                        sleep_ms(10);
                    }
                    uint32_t press_duration = to_ms_since_boot(get_absolute_time()) - press_start;

                    if (press_duration > 1500) {
                        // Long press = launch mission!
                        printf("Launching mission: %s\n", mission_names[selected_mission]);
                        beep(784, 200);
                        sleep_ms(1000);  // countdown
                        beep(784, 200);
                        sleep_ms(1000);
                        beep(1047, 400);  // GO!
                        sleep_ms(500);

                        robot_mode = MODE_RUNNING;
                        run_mission(selected_mission);
                    } else {
                        // Short press = cycle mission
                        selected_mission = (mission_id_t)(
                            (selected_mission % (MISSION_COUNT - 1)) + 1);
                        printf("Selected: %s\n", mission_names[selected_mission]);
                        sfx_beep();
                    }
                }
                break;
            }

            case MODE_COMPLETE:
            case MODE_ERROR:
                // Wait for button press to return to selection
                if (button_pressed()) {
                    robot_mode = MODE_MISSION_SELECT;
                    printf("\nBack to mission select.\n");
                    sfx_beep();
                }
                break;

            case MODE_RUNNING:
                // Mission runner handles this
                break;

            default:
                break;
        }

        sleep_ms(10);
    }

    return 0;
}
```

## Try it
- Start with Mission 1 (Drive a Square) — it's the simplest way to verify everything works
- Measure how accurately the robot returns to its starting position after the square
- Try Mission 2 with a line drawn on paper (thick black marker on white paper works great)
- Set up an obstacle course with boxes or books and run Mission 3
- The ultimate test: Mission 4 — place obstacles ON the line track

## Challenge

Design **Mission 5: Treasure Hunt**. Place a colored object (the "treasure") somewhere in the room. The robot drives forward, scanning with the ultrasonic sensor. When it detects something at close range, it stops and celebrates. Add a second ultrasonic sensor or use the IMU to implement a simple search pattern — drive forward, turn 90°, drive forward, turn 90° (expanding square spiral) until the treasure is found.

## Summary

This is the culmination of everything you've built. The mission system breaks complex autonomous behaviors into simple action sequences. Each action uses a subsystem from a previous project: driving straight uses the IMU (Project 11-12), obstacle detection uses the ultrasonic sensor (Project 5), line following uses the IR sensors (Project 6), and feedback comes from the buzzer (Project 15) and eventually the display (Project 13) and LEDs (Project 14). The state machine architecture (Project 16) manages it all. You've built a real autonomous robot from scratch — sensor by sensor, motor by motor, mission by mission.

## How this fits the robot

This IS the robot. Everything you've built over 20 projects comes together here. The mission system is the top layer of a pyramid: missions call behaviors (drive straight, turn, follow line), behaviors call drivers (motor PWM, sensor reads), and drivers talk to hardware. This layered architecture is exactly how professional robots are built — from Mars rovers to warehouse robots to self-driving cars. You now understand the fundamentals of autonomous robotics. Congratulations!
