# IR Line Sensor Array

## What you'll learn
- How infrared reflective sensors detect dark lines on light surfaces
- How to read analog values from the Pico 2 ADC
- How to wire and calibrate a 3-sensor array
- How to interpret sensor readings to determine line position
- Why calibration is essential for reliable sensing

## Parts you'll need
- 3× TCRT5000 reflective IR sensor modules — $3 (pack of 5 is common)
- Small piece of perfboard or 3D-printed bracket for mounting — $0.50
- Hookup wire — from your kit
- A white poster board with black electrical tape line — $2

**Total: ≈ $5.50**

## Background

Line-following is one of the most classic robot challenges! A strip of black electrical tape on a white surface creates a track. The robot needs to "see" the line and steer to stay on it. But how does a robot see a black line?

The **TCRT5000** sensor has two parts: an infrared LED (shines invisible IR light downward) and a phototransistor (detects reflected IR light). When the sensor is over a **white surface**, lots of light bounces back — the sensor reads a high value. Over a **black line**, the dark surface absorbs most of the light — the sensor reads a low value.

We use **three sensors** side by side, spaced about 1.5 cm apart and mounted on the front of the robot, pointing down at the floor about 5–10 mm above the surface:

- **Left sensor** (GP26, ADC0) — Detects if the line is drifting left
- **Centre sensor** (GP27, ADC1) — Detects if we are right on the line
- **Right sensor** (GP28, ADC2) — Detects if the line is drifting right

By comparing the three readings, the robot knows whether the line is under the left sensor, the centre, the right, or completely lost. This information drives the steering in Project 10.

Every floor and every sensor is slightly different, so we need to **calibrate**. The code will record the minimum and maximum readings for each sensor as you sweep them over the line and white space. Then it maps all future readings to a 0–1000 scale where 0 = white and 1000 = black.

## Wiring

| TCRT5000 Module | Connects To | Notes |
|---|---|---|
| Left VCC | Pico 3V3 OUT | Sensor power |
| Left GND | GND | Common ground |
| Left AO (analog out) | Pico GP26 (ADC0) | Analog reading |
| Centre VCC | Pico 3V3 OUT | Sensor power |
| Centre GND | GND | Common ground |
| Centre AO | Pico GP27 (ADC1) | Analog reading |
| Right VCC | Pico 3V3 OUT | Sensor power |
| Right GND | GND | Common ground |
| Right AO | Pico GP28 (ADC2) | Analog reading |

> Mount the sensors in a row, 1.5 cm apart, on the underside of the robot's front, facing straight down about 5–10 mm above the floor.

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"

#define LEFT_SENSOR_PIN    26   // ADC0
#define CENTER_SENSOR_PIN  27   // ADC1
#define RIGHT_SENSOR_PIN   28   // ADC2

#define NUM_SENSORS  3
#define ADC_MAX      4095

// Calibration data
uint16_t cal_min[NUM_SENSORS] = {4095, 4095, 4095};
uint16_t cal_max[NUM_SENSORS] = {0, 0, 0};

// Map ADC channels to sensor indices: ADC0=0, ADC1=1, ADC2=2
uint8_t adc_channels[NUM_SENSORS] = {0, 1, 2};

void line_sensor_init(void) {
    adc_init();
    adc_gpio_init(LEFT_SENSOR_PIN);
    adc_gpio_init(CENTER_SENSOR_PIN);
    adc_gpio_init(RIGHT_SENSOR_PIN);
    printf("Line sensors initialised (GP26, GP27, GP28).\n");
}

uint16_t read_sensor_raw(int index) {
    adc_select_input(adc_channels[index]);
    return adc_read();
}

// Read all three sensors into an array
void read_line_sensors(uint16_t *raw) {
    for (int i = 0; i < NUM_SENSORS; i++) {
        raw[i] = read_sensor_raw(i);
    }
}

// Calibrate: call this while slowly sweeping sensors over line and white
void calibrate_update(void) {
    uint16_t raw[NUM_SENSORS];
    read_line_sensors(raw);
    for (int i = 0; i < NUM_SENSORS; i++) {
        if (raw[i] < cal_min[i]) cal_min[i] = raw[i];
        if (raw[i] > cal_max[i]) cal_max[i] = raw[i];
    }
}

// Map a raw value to 0–1000 using calibration
int map_sensor(int index, uint16_t raw) {
    if (cal_max[index] == cal_min[index]) return 0;
    int mapped = (int)(((int32_t)(raw - cal_min[index]) * 1000) /
                       (cal_max[index] - cal_min[index]));
    if (mapped < 0)    mapped = 0;
    if (mapped > 1000) mapped = 1000;
    return mapped;
}

// Returns line position: -1 = left, 0 = centre, 1 = right, -99 = lost
int detect_line_position(void) {
    uint16_t raw[NUM_SENSORS];
    read_line_sensors(raw);

    int val[NUM_SENSORS];
    for (int i = 0; i < NUM_SENSORS; i++) {
        val[i] = map_sensor(i, raw[i]);
    }

    int threshold = 500;  // Above this = on the line (black)

    bool left_on   = val[0] > threshold;
    bool center_on = val[1] > threshold;
    bool right_on  = val[2] > threshold;

    if (center_on)              return  0;   // Centred on line
    if (left_on && !right_on)   return -1;   // Line is to the left
    if (right_on && !left_on)   return  1;   // Line is to the right
    if (left_on && right_on)    return  0;   // Wide line or intersection
    return -99;                              // Line lost!
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);

    line_sensor_init();

    // --- Calibration phase ---
    printf("=== CALIBRATION ===\n");
    printf("Sweep the robot over the line and white area for 5 seconds...\n");

    uint32_t cal_start = to_ms_since_boot(get_absolute_time());
    while (to_ms_since_boot(get_absolute_time()) - cal_start < 5000) {
        calibrate_update();
        sleep_ms(10);
    }

    printf("Calibration done!\n");
    for (int i = 0; i < NUM_SENSORS; i++) {
        printf("  Sensor %d: min=%u  max=%u\n", i, cal_min[i], cal_max[i]);
    }
    printf("\n");

    // --- Live reading phase ---
    printf("=== LINE DETECTION ===\n");
    const char *positions[] = {"LEFT ", "CENTRE", "RIGHT"};

    while (true) {
        uint16_t raw[NUM_SENSORS];
        read_line_sensors(raw);

        int pos = detect_line_position();

        printf("L:%4u  C:%4u  R:%4u  → ", raw[0], raw[1], raw[2]);
        if (pos == -99) {
            printf("LINE LOST\n");
        } else {
            printf("%s\n", positions[pos + 1]);
        }

        sleep_ms(200);
    }

    return 0;
}
```

## Try it
1. **Raw value exploration** — Before calibrating, look at the raw ADC values over white and black. You will see a clear difference.
2. **Tape width** — Try 1 cm wide tape vs 2 cm wide. With narrow tape, only one sensor can be on the line at a time. With wide tape, two might see it.
3. **Height matters** — Lift the robot higher off the ground. Readings become less distinct because the IR light spreads out.
4. **Ambient light** — Test in a bright room vs a dim room. Overhead lights can affect IR sensors!

## Challenge

Add a fourth and fifth sensor (if you have a 5-pack) to create a wider array. With 5 sensors, you can calculate a weighted average position instead of just left/centre/right. This gives much smoother line following in Project 10.

## Summary

You mounted three IR reflective sensors, learned to calibrate them, and wrote functions that read analog values and detect whether the line is under the left, centre, or right sensor. The robot can now see a line on the floor!

## How this fits the robot

The line sensor array is the robot's downward-facing "eyes." While the ultrasonic sensor (Project 7) looks forward for obstacles, these sensors look down for path markings. In Project 10, the line position data feeds directly into a PD controller to steer the robot smoothly along a track.
