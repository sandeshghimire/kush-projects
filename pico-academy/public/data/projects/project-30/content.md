# Project 30: Pocket Thermometer — What is the Temperature RIGHT NOW?

## 🎯 What You'll Learn
- How an NTC thermistor changes resistance with temperature
- How to use math to convert resistance into temperature (Steinhart-Hart equation)
- How to read voltage dividers with ADC
- How digital thermometers really work inside!

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Digital Temperature Module (NTC thermistor) | $1.50 |
| LED (any colour) | $0.10 |
| 220Ω Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$11.70** |

## 🌟 The Story

Before digital thermometers existed, people used thin glass tubes filled with red liquid. As it got hotter, the liquid expanded and climbed up the tube. Pretty old-school! Today, tiny electronic components called thermistors do the same job — but they change electrical resistance instead of liquid height.

Your Digital Temperature Module has an NTC (Negative Temperature Coefficient) thermistor inside. "Negative" means when temperature goes UP, resistance goes DOWN — they are opposites! Your Pico reads this resistance and does some clever maths to calculate the exact temperature. Then it sends you a friendly message like "You are melting! 🌡️" or "Bundle up, it is freezing!"

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Temperature Module VCC | Pico 3.3V | Power |
| Temperature Module GND | Pico GND | Ground |
| Temperature Module AO | Pico GP26 (ADC0) | Analog output |
| LED long leg | Pico GP15 via 220Ω | Temperature status LED |
| LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/adc.h"   // For reading the thermistor
#include <stdio.h>          // For printf
#include <math.h>           // For log() and pow() math functions

// Pin definitions
#define THERM_PIN   26      // Thermistor module analog output
#define ADC_INPUT    0      // ADC channel for GP26
#define LED_PIN     15      // Status LED

// Thermistor math constants
// These values are for a typical 10k NTC thermistor
#define SERIES_RESISTOR   10000   // 10k Ohm series resistor in module
#define NOMINAL_RESISTANCE 10000  // Resistance at 25 Celsius
#define NOMINAL_TEMP          25  // Reference temperature in Celsius
#define B_COEFFICIENT       3950  // B-coefficient of thermistor

// ADC reference voltage and resolution
#define ADC_VREF    3.3f          // 3.3 Volt reference
#define ADC_BITS    4096          // 12-bit ADC = 4096 steps

// How many samples to average
#define SAMPLES     10

// Read multiple ADC samples and return the average
float read_adc_average() {
    uint32_t total = 0;                     // Sum of readings
    for (int i = 0; i < SAMPLES; i++) {    // Take multiple samples
        total += adc_read();               // Add each reading
        sleep_us(500);                     // Short wait
    }
    return (float)(total / SAMPLES);       // Return average
}

// Convert ADC reading to temperature in Celsius
// Uses the Steinhart-Hart equation (don't worry — it's just maths!)
float adc_to_celsius(float adc_value) {
    // Step 1: Convert ADC reading to voltage
    float voltage = adc_value * ADC_VREF / ADC_BITS;

    // Step 2: Calculate thermistor resistance using voltage divider formula
    // The module has a voltage divider: Vcc -> series resistor -> thermistor -> GND
    float resistance = SERIES_RESISTOR * voltage / (ADC_VREF - voltage);

    // Step 3: Use Steinhart-Hart B equation to find temperature
    // 1/T = 1/T0 + (1/B) * ln(R/R0)
    float steinhart;
    steinhart = resistance / NOMINAL_RESISTANCE;    // R / R0
    steinhart = log(steinhart);                     // ln(R/R0)
    steinhart /= B_COEFFICIENT;                     // Divide by B
    steinhart += 1.0f / (NOMINAL_TEMP + 273.15f);  // Add 1/T0
    steinhart = 1.0f / steinhart;                   // Invert
    steinhart -= 273.15f;                           // Convert Kelvin to Celsius

    return steinhart;                               // Return temperature!
}

// Convert Celsius to Fahrenheit (for our American friends!)
float celsius_to_fahrenheit(float c) {
    return (c * 9.0f / 5.0f) + 32.0f;   // Formula for conversion
}

// Print a fun message based on temperature
void print_temperature_message(float temp) {
    if (temp < 0.0f) {
        printf("BRRRR! Below freezing! [*_*]\n");
        gpio_put(LED_PIN, 0);              // LED off when super cold
    } else if (temp < 10.0f) {
        printf("Bundle up! It's really cold! [>_<]\n");
        gpio_put(LED_PIN, 0);              // LED off when cold
    } else if (temp < 18.0f) {
        printf("A bit chilly. Grab a jumper! [^_^]\n");
        gpio_put(LED_PIN, 1);              // LED blinks gently
        sleep_ms(50);
        gpio_put(LED_PIN, 0);
    } else if (temp < 24.0f) {
        printf("Nice and comfortable! [=_=]\n");
        gpio_put(LED_PIN, 1);              // LED steady on
    } else if (temp < 30.0f) {
        printf("Getting warm! Maybe open a window? [o_o]\n");
        gpio_put(LED_PIN, 1);              // LED on
    } else if (temp < 37.0f) {
        printf("HOT! Is the heating on? [O_O]\n");
        gpio_put(LED_PIN, 1);              // LED on bright
    } else {
        printf("*** VERY HOT! Are you okay?! [X_X] ***\n");
        // Flash LED rapidly for danger!
        for (int i = 0; i < 3; i++) {
            gpio_put(LED_PIN, 1);
            sleep_ms(100);
            gpio_put(LED_PIN, 0);
            sleep_ms(100);
        }
    }
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up ADC
    adc_init();                             // Initialize ADC system
    adc_gpio_init(THERM_PIN);              // Set GP26 as analog input
    adc_select_input(ADC_INPUT);           // Select ADC channel 0

    // Set up LED
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    gpio_put(LED_PIN, 0);

    printf("=== POCKET THERMOMETER ===\n");
    printf("Warming up sensor...\n\n");
    sleep_ms(1000);                         // Give sensor time to settle

    int reading_count = 0;                  // Count readings taken

    while (true) {                          // Loop forever

        float adc_val = read_adc_average();         // Read ADC
        float temp_c = adc_to_celsius(adc_val);     // Convert to Celsius
        float temp_f = celsius_to_fahrenheit(temp_c); // Also get Fahrenheit

        reading_count++;                            // Count readings

        // Print the temperature
        printf("--- Reading #%d ---\n", reading_count);
        printf("Temperature: %.1f C  (%.1f F)\n", temp_c, temp_f);

        // Print a fun message
        print_temperature_message(temp_c);

        printf("\n");
        sleep_ms(2000);             // New reading every 2 seconds
    }

    return 0;
}
```

## 🔍 How It Works

1. The NTC thermistor changes its resistance as temperature changes
2. Lower temperature = higher resistance, higher temperature = lower resistance
3. The module creates a voltage divider — the output voltage depends on the resistance
4. The ADC reads this voltage as a number from 0 to 4095
5. The Steinhart-Hart equation converts this number into a real temperature in Celsius!

## 🎮 Try It!

- Check the room temperature — what does your Pico say?
- Hold the sensor tightly in your fist — watch the temperature rise!
- Put the sensor near a cold window in winter — can you measure the difference?
- Compare your reading to a real thermometer — how accurate is yours?

## 🏆 Challenge

Store the last 10 temperature readings in an array and calculate a running average. Also track the minimum and maximum temperatures seen since startup and print them. Now you have a proper data logger! Can you spot temperature patterns over an hour?

## 📝 What You Built

You built a digital thermometer using an NTC thermistor and the Steinhart-Hart temperature conversion equation! You learned about voltage dividers, analog sensors, and the maths that turns a simple resistance change into a real temperature reading — just like in commercial thermometers.
