# Lesson 30: Digital Temperature Module — Hot or Not?

## 🎯 What You'll Learn
- What an NTC thermistor is and how it measures temperature
- Why resistance goes DOWN when temperature goes UP (negative coefficient!)
- How to read both the analog and digital outputs
- How to convert an ADC reading into a Celsius temperature
- How to build a fan control system based on temperature!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Digital Temperature Module (NTC thermistor) from Elegoo kit
- LED (any color) or the RGB module
- Small Phillips screwdriver (for the sensitivity dial)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Remember the DS18B20 from Lesson 21? That was a high-tech digital sensor with a microchip inside. The **NTC thermistor** in this lesson is much simpler — it is just a resistor that changes its resistance based on temperature! NTC stands for **Negative Temperature Coefficient**. The "negative" part means: as temperature goes UP, resistance goes DOWN. Think of it like an ice cube in a drink — when it is cold, the ice (resistance) is big and solid. As it warms up, the ice melts (resistance gets smaller) and less ice is left!

Because resistance changes with temperature, the voltage output of the module also changes. Connect it to the Pico's ADC and you get a number that represents temperature. The module gives you TWO outputs: the **AO** (analog output) gives you a precise number that changes smoothly with temperature. The **DO** (digital output) gives you a simple HIGH/LOW depending on whether the temperature is above or below a threshold you set with the little dial on the module.

The Digital Temperature Module is a brilliant example of making electronics simple. You could use the digital output to do simple things — "is it too hot? Yes or no?" — without any math. Or you can use the analog output and a little mathematics to calculate the exact temperature. In this lesson, we will do both! We will calculate temperature from the analog reading and use the digital output to trigger a "cooling fan needed!" alert.

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | AO (analog output) | Analog voltage — changes with temperature |
| GP15 | DO (digital output) | HIGH = below threshold, LOW = above threshold (hot!) |
| 3V3 | VCC | Power |
| GND | GND | Ground |
| GP16 | — | LED for "too hot" warning |

---

## 💻 The Code

```c
/**
 * Lesson 30: Digital Temperature Module (NTC Thermistor)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * NTC = Negative Temperature Coefficient
 * As temperature rises, resistance falls, voltage rises.
 * AO = analog output (precise temperature calculation)
 * DO = digital output (HIGH = cool, LOW = too hot — set by dial)
 *
 * We convert ADC reading to Celsius using the Steinhart-Hart equation.
 */

#include <stdio.h>           // For printf()
#include <math.h>            // For log() and pow() — math functions
#include "pico/stdlib.h"     // Main Pico SDK
#include "hardware/adc.h"    // ADC library

// Pin definitions
#define THERM_AO_PIN  26   // GP26 = ADC0 — analog thermistor output
#define THERM_DO_PIN  15   // GP15 — digital output (LOW = too hot)
#define WARNING_LED   16   // GP16 — LED for temperature warning

// Thermistor math constants
// These describe the specific thermistor in the Elegoo kit
#define SERIES_RESISTOR   10000.0f   // 10kΩ resistor in series with thermistor
#define NOMINAL_RESISTANCE 10000.0f  // Thermistor resistance at 25°C = 10kΩ
#define NOMINAL_TEMP          25.0f  // Temperature for nominal resistance (°C)
#define B_COEFFICIENT       3950.0f  // Beta coefficient of thermistor

// Convert ADC reading to temperature in Celsius
// This uses the Steinhart-Hart simplified equation
float adc_to_celsius(uint16_t adc_value) {
    // Step 1: Convert ADC reading to actual resistance
    // The circuit has the thermistor and a 10k resistor in a voltage divider
    // Formula: R = series_R * (ADC_max / ADC_reading - 1)
    float resistance = SERIES_RESISTOR * (4095.0f / (float)adc_value - 1.0f);

    // Step 2: Use Steinhart-Hart equation to find temperature
    // This is the math that converts resistance to temperature
    // 1/T = 1/T0 + (1/B) * ln(R/R0)
    float steinhart;
    steinhart  = resistance / NOMINAL_RESISTANCE;   // R / R0
    steinhart  = log(steinhart);                    // ln(R/R0)  — natural log
    steinhart /= B_COEFFICIENT;                     // Divide by B
    steinhart += 1.0f / (NOMINAL_TEMP + 273.15f);  // Add 1/T0 (in Kelvin!)
    steinhart  = 1.0f / steinhart;                 // Invert to get temperature
    steinhart -= 273.15f;                           // Convert Kelvin to Celsius

    return steinhart;   // Return temperature in Celsius
}

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 30: Digital Temperature Module (NTC Thermistor) ===\n");
    printf("Hold the thermistor to warm it up!\n\n");

    // Set up ADC for thermistor analog input
    adc_init();
    adc_gpio_init(THERM_AO_PIN);   // GP26 as analog input

    // Set up digital output pin as input (we read it)
    gpio_init(THERM_DO_PIN);
    gpio_set_dir(THERM_DO_PIN, GPIO_IN);
    gpio_pull_up(THERM_DO_PIN);

    // Set up warning LED as output
    gpio_init(WARNING_LED);
    gpio_set_dir(WARNING_LED, GPIO_OUT);
    gpio_put(WARNING_LED, 0);   // LED off at start

    printf("Time(s) | ADC  | Resistance | Temp (C) | Status\n");
    printf("--------|------|------------|----------|---------\n");

    int seconds = 0;   // Track elapsed time

    while (true) {

        // Read ADC value from thermistor
        adc_select_input(0);                   // ADC channel 0 = GP26
        uint16_t adc_val = adc_read();         // Read 0-4095

        // Calculate actual resistance of thermistor
        float resistance = SERIES_RESISTOR * (4095.0f / (float)adc_val - 1.0f);

        // Convert to Celsius using Steinhart-Hart equation
        float temp_c = adc_to_celsius(adc_val);

        // Read digital output: LOW means temperature exceeded threshold
        bool too_hot = !gpio_get(THERM_DO_PIN);   // LOW = hot, so invert

        // Update warning LED
        gpio_put(WARNING_LED, too_hot ? 1 : 0);   // LED on if too hot

        // Describe temperature in fun terms
        const char* description;
        if (temp_c < 15.0f) {
            description = "COLD!";
        } else if (temp_c < 25.0f) {
            description = "Cool";
        } else if (temp_c < 35.0f) {
            description = "Warm";
        } else if (temp_c < 40.0f) {
            description = "Hot!";
        } else {
            description = "VERY HOT!";
        }

        // Print all readings in a nice table row
        printf("%7d | %4d | %10.0f | %8.2f | %s %s\n",
               seconds,
               adc_val,
               resistance,
               temp_c,
               description,
               too_hot ? "[DIGITAL ALARM!]" : "");

        seconds += 2;      // We sleep 2 seconds between readings
        sleep_ms(2000);    // Wait 2 seconds before next reading
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **NTC behavior:** As the thermistor gets hotter, its resistance drops. This causes more voltage to appear across it in the circuit, pushing the ADC value up. So: hotter = higher ADC = higher number!

2. **Steinhart-Hart equation:** This is a mathematical formula used by engineers worldwide to convert thermistor resistance to temperature. It uses the `log()` (natural logarithm) function from `math.h`. It looks scary but just follow the steps in the code comments!

3. **`#include <math.h>`:** This brings in the math library which gives us `log()` (natural logarithm) and `pow()`. The Pico SDK includes this library automatically when you add it.

4. **Digital output:** The DO pin goes LOW when temperature exceeds the dial's threshold. We invert it with `!gpio_get()` because LOW means "too hot" and we want `true` to mean "too hot".

5. **Table printing:** `printf("%7d | %4d | %10.0f | %8.2f")` uses format specifiers to print numbers in fixed-width columns so they align neatly in a table. Very useful for reading data!

---

## 🎮 Try It!

1. **Hand warmth:** Hold the thermistor (the small black component) between your fingers. Watch the temperature rise toward body temperature (37°C)!

2. **Cool test:** Put it near an ice pack briefly. Watch the temperature drop!

3. **Set the alarm:** Use a screwdriver to turn the dial until the DO output triggers (LED comes on). Then touch the thermistor with warm fingers to see if it triggers!

4. **Room temperature:** Leave it alone and let it settle. What is the actual temperature of your room?

---

## 🏆 Challenge

Build a **thermostat**! Decide on a target temperature (like 30°C). Connect an LED to represent a "heater" (GP9) and another LED for "cooler" (GP10). If temperature is below 28°C, turn on the "heater" LED. If temperature is above 32°C, turn on the "cooler" LED. If it is between 28°C and 32°C, turn both off (comfortable zone!). This is exactly how real home thermostats work!

---

## 📝 Summary

The NTC thermistor is a simple resistor that changes its resistance based on temperature — NTC means Negative Temperature Coefficient, so hotter temperature = lower resistance. By measuring this resistance with the ADC and applying the Steinhart-Hart equation, you can calculate the exact temperature in Celsius. The module's digital output lets you trigger alarms when a temperature threshold is crossed, perfect for cooling fans, thermostats, and temperature-controlled projects!
