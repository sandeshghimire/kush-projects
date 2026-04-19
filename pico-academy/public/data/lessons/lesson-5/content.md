# ADC — Reading Analog Sensors

## What you'll learn
- What analog signals are and how they differ from digital
- How the Pico's ADC converts voltages to numbers
- How to read a potentiometer, light sensor, and temperature sensor
- How to use ADC channels and select between multiple sensors
- How to convert raw ADC values into meaningful units

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- Breadboard (~$5)
- 1× 10kΩ potentiometer (~$0.50)
- 1× light-dependent resistor (LDR) + 10kΩ resistor (~$0.30)
- 1× TMP36 temperature sensor (~$1.50)
- 6× jumper wires (~$0.60)

## Background

Digital signals are like light switches — on or off, 1 or 0. But the real world isn't like that! Temperature changes smoothly, light dims gradually, and a knob can be turned to any position. These are **analog** signals — they can be any value, not just two.

The Pico's **Analog-to-Digital Converter** (ADC) is like a translator that converts smooth analog voltages into numbers your code can understand. It reads the voltage on a pin (between 0V and 3.3V) and gives you a number from 0 to 4095. That's 12 bits of resolution — 4,096 different levels! A reading of 0 means 0V, 2048 means about 1.65V (halfway), and 4095 means 3.3V.

The Pico 2 has **three ADC input pins** you can use: GP26 (ADC channel 0), GP27 (ADC channel 1), and GP28 (ADC channel 2). There's also a fourth internal channel that reads the Pico's own temperature sensor. You can switch between channels to read different sensors, but only one at a time.

A **potentiometer** (pot) is a knob that acts like a variable resistor. It has three pins: one to 3.3V, one to GND, and the middle one outputs a voltage that changes as you turn the knob. An **LDR** (light-dependent resistor) changes its resistance based on how much light hits it — more light means less resistance. We pair it with a fixed 10kΩ resistor to form a voltage divider. The **TMP36** is a temperature sensor that outputs a voltage proportional to temperature: 750mV at 25°C, with 10mV per degree change.

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP26 (ADC0) | Potentiometer middle pin (wiper) |
| GP27 (ADC1) | LDR + 10kΩ voltage divider output |
| GP28 (ADC2) | TMP36 output pin (middle leg) |
| 3V3  | Pot left pin, LDR top, TMP36 VCC (left leg) |
| GND  | Pot right pin, 10kΩ bottom, TMP36 GND (right leg) |

**LDR voltage divider**: Connect LDR between 3V3 and GP27. Connect a 10kΩ resistor between GP27 and GND.

**TMP36 pinout** (flat side facing you): Left = VCC (3.3V), Middle = Signal (GP28), Right = GND.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include <stdio.h>

#define POT_CHANNEL   0  // GP26
#define LDR_CHANNEL   1  // GP27
#define TEMP_CHANNEL  2  // GP28

// Convert raw 12-bit ADC reading to voltage
float adc_to_voltage(uint16_t raw) {
    return raw * 3.3f / 4095.0f;
}

// Convert TMP36 voltage to temperature in Celsius
float tmp36_to_celsius(float voltage) {
    // TMP36: 750mV at 25°C, 10mV per degree
    return (voltage - 0.5f) * 100.0f;
}

int main() {
    stdio_init_all();  // Enable serial output for debugging

    // Initialize the ADC hardware
    adc_init();

    // Configure GP26, GP27, GP28 as ADC inputs
    adc_gpio_init(26);  // ADC0 — potentiometer
    adc_gpio_init(27);  // ADC1 — LDR
    adc_gpio_init(28);  // ADC2 — TMP36

    while (true) {
        // Read potentiometer
        adc_select_input(POT_CHANNEL);
        uint16_t pot_raw = adc_read();
        float pot_voltage = adc_to_voltage(pot_raw);
        float pot_percent = pot_raw * 100.0f / 4095.0f;

        // Read light sensor
        adc_select_input(LDR_CHANNEL);
        uint16_t ldr_raw = adc_read();
        float ldr_voltage = adc_to_voltage(ldr_raw);

        // Read temperature sensor
        adc_select_input(TEMP_CHANNEL);
        uint16_t temp_raw = adc_read();
        float temp_voltage = adc_to_voltage(temp_raw);
        float temp_celsius = tmp36_to_celsius(temp_voltage);

        // Print all readings
        printf("POT: %4d (%.1f%%) | ", pot_raw, pot_percent);
        printf("LDR: %4d (%.2fV) | ", ldr_raw, ldr_voltage);
        printf("TEMP: %.1f°C (%.3fV)\n", temp_celsius, temp_voltage);

        sleep_ms(500);
    }

    return 0;
}
```

### How the code works

1. `adc_init()` powers up the ADC hardware.
2. `adc_gpio_init(pin)` disconnects the pin from digital GPIO and connects it to the ADC.
3. `adc_select_input(channel)` picks which ADC channel to read next (0, 1, or 2).
4. `adc_read()` takes a single reading and returns a 12-bit value (0–4095).
5. We convert raw values to voltages using simple maths: voltage = raw × 3.3 / 4095.

## Try it

1. **LED brightness knob** — Use the potentiometer reading to control an LED's PWM duty cycle from Lesson 4.
2. **Night light** — Turn on an LED when the LDR detects darkness (low reading).
3. **Temperature alarm** — Play a buzzer tone when the temperature goes above 30°C.
4. **Bar graph** — Use three LEDs to show the potentiometer position: 1 LED for 0–33%, 2 for 34–66%, 3 for 67–100%.

## Challenge

Build a simple data logger: read all three sensors once per second and print the values as CSV format over serial. You could then copy the output into a spreadsheet and make graphs of how light and temperature change over time!

## Summary

The ADC translates smooth analog voltages into digital numbers your code can work with. Using `adc_init`, `adc_gpio_init`, `adc_select_input`, and `adc_read`, you can read up to three external sensors on GP26–GP28. You learned to convert raw readings into real-world units like voltage, percentage, and temperature, connecting your Pico to the physical world.
