# Project 27: Auto Dimmer — Lights That Think for Themselves!

## 🎯 What You'll Learn
- How a phototransistor measures light levels
- How to use ADC (Analog to Digital Converter) to read sensor values
- How to use PWM to control LED brightness
- How automatic headlights and night-lights work

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Switch Light Module (phototransistor) | $1.50 |
| Bright LED (white or yellow) | $0.20 |
| 220Ω Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$11.80** |

## 🌟 The Story

Have you ever noticed how street lights turn on automatically when it gets dark? Or how your phone screen dims when you go outside into bright sunlight? Those are smart automatic dimmers at work! They read how much light is around and adjust the brightness accordingly.

A phototransistor is like a light-sensitive switch — the more light that hits it, the more electricity it lets through. Your Pico reads that electricity level and does the opposite for the LED: more light outside = dim the LED. Less light outside = brighten the LED. It is like having a clever robot butler that adjusts the lights for you!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Light Module VCC | Pico 3.3V | Power |
| Light Module GND | Pico GND | Ground |
| Light Module OUT | Pico GP26 (ADC0) | Analog output — must use ADC pin! |
| LED long leg | Pico GP15 via 220Ω | PWM-controlled LED |
| LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/adc.h"   // Need this for reading analog sensors
#include "hardware/pwm.h"   // Need this for controlling LED brightness
#include <stdio.h>          // For printf

// Pin definitions
#define LIGHT_SENSOR_PIN  26    // ADC0 — must be GP26, GP27, or GP28!
#define LED_PIN           15    // PWM LED output

// ADC input number for GP26
#define ADC_INPUT  0            // GP26 = ADC input 0

// LED brightness range
#define PWM_MAX   255           // Maximum brightness (fully on)
#define PWM_MIN   0             // Minimum brightness (fully off)

// How many readings to average (smoothing)
#define SAMPLES   10            // Take 10 samples and average them

// Read the light sensor and return a smoothed value (0-4095)
uint16_t read_light() {
    uint32_t total = 0;                     // Sum of all readings
    for (int i = 0; i < SAMPLES; i++) {    // Take multiple samples
        total += adc_read();               // Add each ADC reading
        sleep_us(100);                     // Short wait between samples
    }
    return (uint16_t)(total / SAMPLES);    // Return the average
}

// Set LED brightness using PWM (0 = off, 255 = full brightness)
void set_led_brightness(uint8_t brightness) {
    uint slice = pwm_gpio_to_slice_num(LED_PIN);    // Get PWM slice for this pin
    uint channel = pwm_gpio_to_channel(LED_PIN);    // Get channel

    pwm_set_chan_level(slice, channel, brightness); // Set brightness level
}

// Map a value from one range to another
// Like converting Celsius to Fahrenheit, but for numbers!
uint16_t map_value(uint16_t value, uint16_t in_min, uint16_t in_max,
                   uint16_t out_min, uint16_t out_max) {
    // Scale the value proportionally
    return (uint16_t)((uint32_t)(value - in_min) * (out_max - out_min)
                      / (in_max - in_min) + out_min);
}

int main() {
    stdio_init_all();           // Start USB serial
    sleep_ms(2000);             // Wait for USB

    // Set up ADC for light sensor
    adc_init();                             // Initialize ADC system
    adc_gpio_init(LIGHT_SENSOR_PIN);        // Set GP26 as analog input
    adc_select_input(ADC_INPUT);            // Select ADC channel 0

    // Set up PWM for LED
    gpio_set_function(LED_PIN, GPIO_FUNC_PWM);      // Set LED pin to PWM mode
    uint slice = pwm_gpio_to_slice_num(LED_PIN);     // Get PWM slice
    pwm_set_wrap(slice, 255);                        // 256 brightness levels
    pwm_set_enabled(slice, true);                    // Enable PWM
    set_led_brightness(0);                           // Start with LED off

    printf("=== AUTO DIMMER ===\n");
    printf("Cover the sensor to make LED brighter!\n");
    printf("Shine light on sensor to dim the LED.\n\n");

    // Track min/max values seen (for auto-calibration)
    uint16_t min_seen = 4095;              // Start with max possible
    uint16_t max_seen = 0;                 // Start with minimum

    while (true) {                         // Loop forever

        uint16_t light_level = read_light();   // Read light sensor (0-4095)

        // Auto-calibrate: update min/max as we see new values
        if (light_level < min_seen) min_seen = light_level;   // New minimum?
        if (light_level > max_seen) max_seen = light_level;   // New maximum?

        // Make sure we have a reasonable range (avoid divide by zero)
        if (max_seen - min_seen < 100) {
            // Not enough range yet — use defaults
            min_seen = 0;
            max_seen = 4095;
        }

        // Invert the light reading for LED brightness
        // High light = low brightness (auto dimmer!)
        // Low light  = high brightness (auto brightener!)
        uint16_t inverted = max_seen - light_level + min_seen;

        // Map to 0-255 range for PWM
        uint8_t brightness = (uint8_t)map_value(
            inverted,               // The inverted light value
            min_seen,               // Input minimum
            max_seen,               // Input maximum
            PWM_MIN,                // Output minimum (off)
            PWM_MAX                 // Output maximum (full bright)
        );

        set_led_brightness(brightness);     // Set LED brightness!

        // Print status every few readings
        printf("Light: %4d | Brightness: %3d%%\n",
               light_level,
               (brightness * 100) / 255);   // Convert to percentage

        sleep_ms(100);              // Update 10 times per second
    }

    return 0;
}
```

## 🔍 How It Works

1. The phototransistor lets more electricity through when more light hits it
2. The Pico's ADC reads this as a number between 0 and 4095
3. We invert this number: high light reading becomes low brightness
4. PWM (Pulse Width Modulation) flickers the LED super fast to control brightness
5. The faster it flickers, the dimmer it looks — your eyes average it out!

## 🎮 Try It!

- Cover the sensor completely with your hand — does the LED reach maximum brightness?
- Shine a torch directly at the sensor — how dim does the LED get?
- Slowly move your hand toward the sensor and watch the LED smoothly change
- Try it in a dark room — see how it reacts to even tiny changes in light

## 🏆 Challenge

Add a second LED that works the opposite way — it gets BRIGHTER when there is more light (like a daylight-following plant lamp). Now you have two LEDs: one for night and one for day. Also try adding a serial plotter graph by printing just the number so you can see a live chart!

## 📝 What You Built

You built an automatic light dimmer that responds to ambient brightness — exactly like the automatic headlights in cars or night-mode on your phone! You learned about ADC (reading analog sensors), PWM (controlling brightness), and auto-calibration.
