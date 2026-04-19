# Distance Sensors — Seeing the World

## What you'll learn
- How ultrasonic sensors measure distance using sound echoes
- How to calculate distance from echo timing
- How infrared proximity sensors detect nearby obstacles
- How to wire and read the HC-SR04 and IR sensors
- How to filter noisy sensor readings for reliable results

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× HC-SR04 ultrasonic sensor (~$2)
- 1× IR obstacle sensor module (~$1)
- 1× LED (~$0.10)
- 1× 330Ω resistor (~$0.05)
- 6× jumper wires (~$0.60)

## Background

How does a bat fly in the dark without bumping into things? It sends out a high-pitched squeak and listens for the echo. By measuring how long the echo takes to come back, the bat knows how far away the wall or insect is. The **HC-SR04 ultrasonic sensor** works exactly the same way, but with sound pulses humans can't hear (40 kHz).

Here's the maths: sound travels at about **343 metres per second** in air. If we send a pulse and the echo comes back after 1 millisecond, the sound traveled for 0.5 ms each way (out and back). Distance = 343 × 0.0005 = 0.1715 metres = 17.15 cm. We divide by 2 because the sound makes a round trip!

The HC-SR04 has two "eyes" — one sends the ultrasonic pulse (TRIG), the other listens for the return (ECHO). To take a reading: send a 10 microsecond HIGH pulse on TRIG, then measure how long the ECHO pin stays HIGH. That duration in microseconds divided by 58 gives the distance in centimetres.

**IR proximity sensors** are simpler: they shine an infrared LED and look for the reflection with a photodiode. They output a digital HIGH or LOW based on whether something is close enough. They're great as simple "something is right in front of me" detectors.

One important note: the HC-SR04 runs at 5V, but the Pico's GPIO is 3.3V. The ECHO pin outputs 5V, which could damage the Pico! Use a voltage divider (two resistors) on the ECHO line, or use an HC-SR04 module that supports 3.3V logic.

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP14 | HC-SR04 TRIG |
| GP15 | HC-SR04 ECHO (through voltage divider if 5V module) |
| GP16 | IR obstacle sensor OUT |
| VBUS (5V) | HC-SR04 VCC |
| 3V3 | IR sensor VCC |
| GND | HC-SR04 GND, IR sensor GND |

**Voltage divider for ECHO** (if needed): 1kΩ from ECHO to GP15, 2kΩ from GP15 to GND. This drops 5V to ~3.3V.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/timer.h"
#include <stdio.h>

#define TRIG_PIN  14
#define ECHO_PIN  15
#define IR_PIN    16

// Measure distance in centimetres using HC-SR04
float measure_distance_cm(void) {
    // Send a 10µs trigger pulse
    gpio_put(TRIG_PIN, 1);
    sleep_us(10);
    gpio_put(TRIG_PIN, 0);

    // Wait for echo to go HIGH (with timeout)
    uint64_t start_wait = time_us_64();
    while (!gpio_get(ECHO_PIN)) {
        if (time_us_64() - start_wait > 30000) return -1.0f;  // Timeout
    }

    // Measure how long echo stays HIGH
    uint64_t echo_start = time_us_64();
    while (gpio_get(ECHO_PIN)) {
        if (time_us_64() - echo_start > 30000) return -1.0f;  // Timeout
    }
    uint64_t echo_end = time_us_64();

    // Calculate distance
    // Speed of sound = 343 m/s = 0.0343 cm/µs
    // Round trip, so divide by 2
    // distance_cm = duration_us * 0.0343 / 2 = duration_us / 58.3
    float duration_us = (float)(echo_end - echo_start);
    float distance_cm = duration_us / 58.3f;

    return distance_cm;
}

// Simple moving average filter for distance readings
#define FILTER_SIZE 5
float distance_filter[FILTER_SIZE];
int filter_index = 0;

float filtered_distance(void) {
    float raw = measure_distance_cm();
    if (raw < 0) return -1.0f;  // Invalid reading

    distance_filter[filter_index] = raw;
    filter_index = (filter_index + 1) % FILTER_SIZE;

    float sum = 0;
    for (int i = 0; i < FILTER_SIZE; i++) {
        sum += distance_filter[i];
    }
    return sum / FILTER_SIZE;
}

int main() {
    stdio_init_all();

    // Ultrasonic sensor pins
    gpio_init(TRIG_PIN);
    gpio_set_dir(TRIG_PIN, GPIO_OUT);
    gpio_put(TRIG_PIN, 0);

    gpio_init(ECHO_PIN);
    gpio_set_dir(ECHO_PIN, GPIO_IN);

    // IR sensor pin (digital input)
    gpio_init(IR_PIN);
    gpio_set_dir(IR_PIN, GPIO_IN);

    // Initialize filter
    for (int i = 0; i < FILTER_SIZE; i++) {
        distance_filter[i] = 100.0f;
    }

    sleep_ms(100);  // Let sensors stabilize

    while (true) {
        // Read ultrasonic distance
        float dist = filtered_distance();

        // Read IR sensor (LOW = obstacle detected on most modules)
        bool ir_obstacle = !gpio_get(IR_PIN);

        if (dist >= 0) {
            printf("Distance: %.1f cm | IR: %s\n",
                   dist, ir_obstacle ? "OBSTACLE!" : "clear");
        } else {
            printf("Distance: timeout | IR: %s\n",
                   ir_obstacle ? "OBSTACLE!" : "clear");
        }

        sleep_ms(100);
    }

    return 0;
}
```

### How the code works

1. We send a 10µs trigger pulse, then use `time_us_64()` to precisely measure the echo pulse width.
2. The distance formula: `duration_µs / 58.3` converts echo time to centimetres.
3. A **moving average filter** smooths out jittery readings by averaging the last 5 measurements.
4. Timeouts prevent the program from hanging if the sensor gets no echo (nothing in range).
5. The IR sensor gives a simple digital yes/no — is something close?

## Try it

1. **Distance alarm** — Light up LEDs in stages: green for >50cm, yellow for 20-50cm, red for <20cm.
2. **Median filter** — Replace the moving average with a median filter (sort 5 readings, take the middle one) for better noise rejection.
3. **Speed of sound** — Place an object at a known distance and calculate the speed of sound from your timing data.

## Challenge

Build a "parking sensor": as an object gets closer, beep a buzzer faster and faster (like a car reversing). Under 10cm, make it a continuous tone. Over 200cm, silence.

## Summary

The HC-SR04 ultrasonic sensor measures distance by timing sound echoes — pulse duration in microseconds divided by 58.3 gives centimetres. IR sensors provide simple digital proximity detection. Filtering (moving average or median) is essential for reliable readings in the real world. These sensors give your robot spatial awareness to detect and avoid obstacles!
