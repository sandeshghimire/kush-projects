# Project 21: Fever Checker — Be Your Own Doctor!

## 🎯 What You'll Learn
- How to read a DS18B20 digital temperature sensor
- How to use the 1-Wire communication protocol
- How to trigger a buzzer alarm when temperature is too high
- How computers can help keep people safe and healthy

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| DS18B20 Temperature Sensor | $2.00 |
| 4.7kΩ Resistor | $0.10 |
| Active Buzzer Module | $1.00 |
| LED (red) | $0.10 |
| 220Ω Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.30** |

## 🌟 The Story

Have you ever felt really hot and your mum checked your forehead? That is called checking for a fever! Doctors use special thermometers to see if your body is too warm. A normal body temperature is about 37°C. If it goes above 37.5°C, you might be sick!

Today you are going to build your very own fever checker! Your Pico will read a tiny sensor, calculate your temperature, and sound an alarm if things get too toasty. It is like having a robot nurse on your desk. Pretty cool, right?

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| DS18B20 VCC (red wire) | Pico 3.3V | Power for sensor |
| DS18B20 GND (black wire) | Pico GND | Ground |
| DS18B20 DATA (yellow wire) | Pico GP2 | Data signal |
| 4.7kΩ resistor | Between GP2 and 3.3V | Pull-up resistor — VERY important! |
| Buzzer + pin | Pico GP15 | Alarm buzzer |
| Buzzer - pin | Pico GND | Ground |
| Red LED long leg | Pico GP14 via 220Ω | Fever warning light |
| Red LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"       // Always include this first!
#include "hardware/gpio.h"     // We need GPIO for 1-Wire
#include <stdio.h>             // For printf to print messages
#include <stdint.h>            // For uint8_t data type

// Pin numbers — change these if you wire differently
#define ONE_WIRE_PIN  2        // DS18B20 data wire goes here
#define BUZZER_PIN   15        // Buzzer alarm pin
#define LED_PIN      14        // Red warning LED pin

// DS18B20 commands (secret codes the sensor understands)
#define DS18B20_CONVERT_T    0x44   // Tell sensor to measure temperature
#define DS18B20_READ_SCRATCH 0xBE   // Tell sensor to send us the data
#define DS18B20_SKIP_ROM     0xCC   // Skip checking sensor ID (only 1 sensor)
#define ROM_SEARCH_RESET     0xFF   // Reset signal

// Temperature limit for fever alarm
#define FEVER_TEMP  37.5f      // 37.5 degrees Celsius = possible fever

// --- 1-Wire Protocol Functions ---
// The DS18B20 uses a special communication called "1-Wire"
// We control the data pin HIGH and LOW to send messages

// Send a reset pulse — like knocking on a door
bool onewire_reset() {
    gpio_set_dir(ONE_WIRE_PIN, GPIO_OUT);   // Set pin as output
    gpio_put(ONE_WIRE_PIN, 0);              // Pull line LOW
    sleep_us(480);                          // Hold LOW for 480 microseconds
    gpio_set_dir(ONE_WIRE_PIN, GPIO_IN);    // Release the line
    sleep_us(70);                           // Wait for sensor to respond
    bool present = !gpio_get(ONE_WIRE_PIN); // Sensor pulls LOW if it is there
    sleep_us(410);                          // Wait for reset to finish
    return present;                         // Return true if sensor answered
}

// Send one bit to the sensor
void onewire_write_bit(bool bit) {
    gpio_set_dir(ONE_WIRE_PIN, GPIO_OUT);   // Set as output
    gpio_put(ONE_WIRE_PIN, 0);              // Start with LOW
    if (bit) {                              // If sending a 1...
        sleep_us(6);                        // Short LOW pulse
        gpio_set_dir(ONE_WIRE_PIN, GPIO_IN);// Release quickly
        sleep_us(64);                       // Wait for time slot
    } else {                               // If sending a 0...
        sleep_us(60);                       // Long LOW pulse
        gpio_set_dir(ONE_WIRE_PIN, GPIO_IN);// Release
        sleep_us(10);                       // Short wait
    }
}

// Read one bit from the sensor
bool onewire_read_bit() {
    gpio_set_dir(ONE_WIRE_PIN, GPIO_OUT);   // Set as output
    gpio_put(ONE_WIRE_PIN, 0);              // Pull LOW briefly
    sleep_us(3);                            // Very short pulse
    gpio_set_dir(ONE_WIRE_PIN, GPIO_IN);    // Release and listen
    sleep_us(10);                           // Wait for sensor to respond
    bool bit = gpio_get(ONE_WIRE_PIN);      // Read the value
    sleep_us(53);                           // Finish the time slot
    return bit;                             // Return the bit we read
}

// Send a full byte (8 bits) to the sensor
void onewire_write_byte(uint8_t byte) {
    for (int i = 0; i < 8; i++) {          // Loop through all 8 bits
        onewire_write_bit(byte & 0x01);     // Send the lowest bit
        byte >>= 1;                         // Shift to next bit
    }
}

// Read a full byte (8 bits) from the sensor
uint8_t onewire_read_byte() {
    uint8_t byte = 0;                       // Start with zero
    for (int i = 0; i < 8; i++) {          // Loop through 8 bits
        if (onewire_read_bit()) {           // If bit is 1...
            byte |= (1 << i);              // Set that bit in our byte
        }
    }
    return byte;                            // Return the full byte
}

// Read temperature from DS18B20 sensor
float read_temperature() {
    if (!onewire_reset()) {                 // Send reset and check if sensor is there
        printf("No sensor found!\n");       // Print error if missing
        return -999.0f;                     // Return error value
    }
    onewire_write_byte(DS18B20_SKIP_ROM);   // Skip ROM check (just 1 sensor)
    onewire_write_byte(DS18B20_CONVERT_T); // Tell sensor to measure temperature
    sleep_ms(750);                          // Wait 750ms for conversion
    
    onewire_reset();                        // Reset again to read data
    onewire_write_byte(DS18B20_SKIP_ROM);  // Skip ROM again
    onewire_write_byte(DS18B20_READ_SCRATCH); // Ask for the measurement

    uint8_t lsb = onewire_read_byte();     // Read low byte of temperature
    uint8_t msb = onewire_read_byte();     // Read high byte of temperature

    int16_t raw = (msb << 8) | lsb;       // Combine into 16-bit number
    float temp = raw / 16.0f;              // DS18B20 gives 1/16 degree steps
    return temp;                            // Return temperature in Celsius
}

// Beep the buzzer once
void beep(int duration_ms) {
    gpio_put(BUZZER_PIN, 1);               // Turn buzzer ON
    sleep_ms(duration_ms);                 // Wait
    gpio_put(BUZZER_PIN, 0);              // Turn buzzer OFF
    sleep_ms(100);                         // Short pause
}

int main() {
    stdio_init_all();                       // Start USB serial communication
    sleep_ms(2000);                         // Wait 2 seconds for USB to connect

    // Set up our pins
    gpio_init(ONE_WIRE_PIN);               // Initialize 1-Wire pin
    gpio_set_dir(ONE_WIRE_PIN, GPIO_IN);   // Start as input with pull-up
    gpio_pull_up(ONE_WIRE_PIN);            // Enable internal pull-up resistor

    gpio_init(BUZZER_PIN);                 // Initialize buzzer pin
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);    // Set as output
    gpio_put(BUZZER_PIN, 0);              // Make sure buzzer is off

    gpio_init(LED_PIN);                    // Initialize LED pin
    gpio_set_dir(LED_PIN, GPIO_OUT);       // Set as output
    gpio_put(LED_PIN, 0);                 // Make sure LED is off

    printf("=== FEVER CHECKER ===\n");     // Print welcome message
    printf("Warming up sensor...\n");      // Tell user we are starting
    sleep_ms(1000);                        // Give sensor time to wake up

    while (true) {                         // Loop forever
        float temp = read_temperature();   // Read the temperature

        if (temp == -999.0f) {             // If sensor not found...
            printf("ERROR: Sensor missing! Check wiring.\n");
            beep(500);                     // Long warning beep
            sleep_ms(2000);               // Wait before trying again
            continue;                      // Skip the rest of this loop
        }

        printf("Temperature: %.1f C  ", temp);  // Print temperature

        if (temp >= FEVER_TEMP) {          // If temperature is high...
            printf("*** FEVER ALERT! ***\n");   // Print warning
            gpio_put(LED_PIN, 1);          // Turn on red LED
            beep(200);                     // Quick beep
            beep(200);                     // Quick beep
            beep(200);                     // Quick beep
        } else if (temp >= 36.0f) {        // Normal body temperature range
            printf("Normal temperature. You are fine!\n");
            gpio_put(LED_PIN, 0);          // LED off
        } else {                           // Temperature is low
            printf("A bit cool. Are you cold?\n");
            gpio_put(LED_PIN, 0);          // LED off
        }

        sleep_ms(2000);                    // Wait 2 seconds before next reading
    }

    return 0;                              // Program ends (never reaches here)
}
```

## 🔍 How It Works

1. The DS18B20 sensor has a tiny chip inside that changes its electrical signal based on temperature
2. The Pico sends special 1-Wire signals to ask for a reading
3. The sensor measures temperature and sends back two bytes of data
4. The Pico converts those bytes into a real temperature number
5. If the temperature is above 37.5°C, the LED lights up and the buzzer sounds

## 🎮 Try It!

- Hold the sensor between your fingers — watch the temperature rise!
- Put the sensor near something cold (like a cold drink) and watch it drop
- Change `FEVER_TEMP` to 30.0 and trigger it with your hand
- Try touching the sensor with an ice cube — what happens?

## 🏆 Challenge

Add a second LED (green) that lights up when temperature is normal, and a yellow LED that turns on when temperature is between 37.0°C and 37.5°C. Now you have a proper traffic-light fever checker!

## 📝 What You Built

You built a digital fever checker using a DS18B20 temperature sensor and the special 1-Wire communication protocol. Your Pico can now detect body temperature and sound an alarm if someone might have a fever — just like a real medical device!
