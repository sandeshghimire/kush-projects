# Front Ultrasonic Eye

## What you'll learn
- How ultrasonic distance sensing works (sound echoes!)
- Why the HC-SR04 needs a voltage divider for the 3.3 V Pico 2
- How to measure pulse width with microsecond precision
- How to write a reliable `measure_distance_cm()` function
- How to handle out-of-range readings gracefully

## Parts you'll need
- HC-SR04 ultrasonic distance sensor — $1.50
- 1× 1 kΩ resistor — $0.05
- 1× 2 kΩ resistor (or 2× 1 kΩ in series) — $0.10
- 3D-printed or cardboard sensor mount — free (DIY)
- 4 jumper wires — from your kit

**Total: ≈ $1.65**

## Background

Bats fly in the dark by making high-pitched squeaks and listening for the echo. If the echo comes back quickly, something is close. If it takes longer, the object is far away. The HC-SR04 ultrasonic sensor does exactly the same thing, but with sound too high for human ears (40 kHz).

Here is how it works step-by-step:
1. The Pico sends a short 10-microsecond HIGH pulse on the **TRIG** pin.
2. The sensor fires eight bursts of 40 kHz ultrasound from its transmitter (the round "eye" on the left).
3. The sound travels through the air, hits an object, and bounces back.
4. The receiver (right "eye") detects the echo.
5. The sensor pulls the **ECHO** pin HIGH for a duration proportional to the round-trip time.

The Pico measures how long ECHO stays HIGH in microseconds. Since sound travels at about 343 metres per second (at room temperature), the distance in centimetres is:

**distance = (echo_time_us × 0.0343) / 2**

We divide by 2 because the sound travels to the object *and back*.

One important detail: the HC-SR04 runs on 5 V and its ECHO pin outputs 5 V. The Pico 2 GPIO pins are 3.3 V only! Feeding 5 V into a GPIO can damage the chip. We use a simple **voltage divider** with a 1 kΩ and 2 kΩ resistor to drop the 5 V echo signal to about 3.3 V — safe for the Pico.

## Wiring

| HC-SR04 Pin | Connects To | Notes |
|---|---|---|
| VCC | Pico VBUS (5 V, pin 40) | Sensor needs 5 V power |
| GND | GND | Common ground |
| TRIG | Pico GP14 | Trigger pulse output |
| ECHO | Voltage divider → Pico GP15 | See divider below |

**Voltage divider for ECHO pin:**
```
HC-SR04 ECHO ──[ 1 kΩ ]──┬──→ Pico GP15
                          │
                        [ 2 kΩ ]
                          │
                         GND
```
This gives: 5 V × (2 kΩ / 3 kΩ) ≈ 3.3 V on GP15. Safe!

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/timer.h"

#define TRIG_PIN  14
#define ECHO_PIN  15

#define TIMEOUT_US    30000   // ~5 metre max range timeout
#define SOUND_SPEED   0.0343f // cm per microsecond

void ultrasonic_init(void) {
    gpio_init(TRIG_PIN);
    gpio_set_dir(TRIG_PIN, GPIO_OUT);
    gpio_put(TRIG_PIN, 0);

    gpio_init(ECHO_PIN);
    gpio_set_dir(ECHO_PIN, GPIO_IN);
    gpio_pull_down(ECHO_PIN);  // Default low when no echo
}

float measure_distance_cm(void) {
    // Send a 10 µs trigger pulse
    gpio_put(TRIG_PIN, 1);
    sleep_us(10);
    gpio_put(TRIG_PIN, 0);

    // Wait for ECHO to go HIGH (start of pulse)
    uint64_t start_wait = time_us_64();
    while (gpio_get(ECHO_PIN) == 0) {
        if (time_us_64() - start_wait > TIMEOUT_US) {
            return -1.0f;  // Timeout — no echo detected
        }
    }

    // Measure how long ECHO stays HIGH
    uint64_t pulse_start = time_us_64();
    while (gpio_get(ECHO_PIN) == 1) {
        if (time_us_64() - pulse_start > TIMEOUT_US) {
            return -1.0f;  // Timeout — object too far
        }
    }
    uint64_t pulse_end = time_us_64();

    // Calculate distance
    uint64_t pulse_duration = pulse_end - pulse_start;
    float distance = (pulse_duration * SOUND_SPEED) / 2.0f;

    return distance;
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    ultrasonic_init();

    printf("=== Ultrasonic Distance Sensor ===\n");
    printf("Point the sensor at objects and watch the distance.\n\n");

    while (true) {
        float dist = measure_distance_cm();

        if (dist < 0) {
            printf("Out of range (no echo)\n");
        } else {
            printf("Distance: %6.1f cm", dist);
            // Simple proximity bar
            if (dist < 10.0f)       printf("  ████████ VERY CLOSE!");
            else if (dist < 25.0f)  printf("  ██████ CLOSE");
            else if (dist < 50.0f)  printf("  ████ MEDIUM");
            else if (dist < 100.0f) printf("  ██ FAR");
            else                    printf("  █ VERY FAR");
            printf("\n");
        }

        sleep_ms(100);  // HC-SR04 needs ~60 ms between pings
    }

    return 0;
}
```

## Try it
1. **Ruler test** — Place a flat book at 10 cm, 20 cm, and 30 cm from the sensor. Compare the readings to your ruler measurement.
2. **Angle test** — Tilt the sensor 30° to the side. Notice how angled surfaces give unreliable readings — ultrasonic works best head-on.
3. **Soft objects** — Try measuring distance to a pillow vs a hard wall. Soft, fluffy objects absorb sound and may give wrong readings.
4. **Speed it up** — Change the delay to 60 ms and see if readings are still stable.

## Challenge

Mount a small servo motor under the ultrasonic sensor and make the sensor sweep left and right (like a radar). Print a simple ASCII map of distances at different angles — you are building a mini sonar scanner!

## Summary

You wired the HC-SR04 ultrasonic sensor with a voltage divider to protect the Pico's 3.3 V GPIO. Your `measure_distance_cm()` function sends a trigger pulse, times the echo, and calculates distance using the speed of sound. The robot can now "see" how far away objects are.

## How this fits the robot

The ultrasonic sensor is the robot's front eye. In Project 8, it will continuously scan ahead while driving. When an obstacle appears within 25 cm, the robot will stop and steer around it — transforming your car from a blind racer into an autonomous navigator.
