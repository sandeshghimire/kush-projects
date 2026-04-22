# Lesson 21: DS18B20 Precise Temperature Sensor — The Super Thermometer!

## 🎯 What You'll Learn
- How the DS18B20 sensor measures temperature super accurately
- What the 1-Wire protocol is and how it works
- How to read temperature in Celsius from just one data pin
- Why this sensor is great for measuring water, body heat, and food temperature
- How to show temperature readings on your serial monitor

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- DS18B20 Temperature Sensor (from Elegoo kit, or ~$2 standalone)
- 4.7kΩ resistor (~$0.05) — very important! The sensor needs this
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Imagine you had a thermometer so accurate it could tell the difference between 36.5°C and 36.6°C. That is what the DS18B20 does! It is like the fancy thermometer a doctor uses — but you can build it into your own projects. The DS18B20 can measure temperatures from -55°C (colder than Antarctica!) all the way up to 125°C (hotter than boiling water!). And it is accurate to just 0.5°C. That is impressive for a tiny sensor that costs about the same as a piece of gum!

The really clever thing about the DS18B20 is how it talks to the Pico. Most sensors need separate pins for power, ground, and data. But the DS18B20 uses something called the **1-Wire protocol** — it sends all its data through just ONE wire! It is like whispering a secret code through a single string between two tin cans. The Pico sends a special signal down the wire to say "wake up!", and the sensor sends back the temperature as a string of zeros and ones. Very clever!

You might have noticed there is a **4.7kΩ resistor** in the parts list. This is called a **pull-up resistor** and it is not optional — the sensor will not work without it! Think of it like a gentle hand that holds the data wire at 3.3V when nobody is sending anything. Without it, the wire would just float around randomly and the sensor would send garbage data. Always include the pull-up resistor!

---

## 🔌 Wiring

| Pico 2 W Pin | Component | Notes |
|---|---|---|
| GP22 | DS18B20 Data (middle pin) | The data wire |
| 3V3 | DS18B20 VCC (left pin, flat side up) | Power — 3.3V |
| GND | DS18B20 GND (right pin, flat side up) | Ground |
| GP22 → 3V3 | 4.7kΩ resistor | Connect between data and 3.3V — required! |

> **Tip:** Hold the DS18B20 with the flat side facing you. Left pin = VCC, middle pin = Data, right pin = GND.

---

## 💻 The Code

```c
/**
 * Lesson 21: DS18B20 Precise Temperature Sensor
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * The DS18B20 uses the 1-Wire protocol.
 * We implement the protocol manually using a single GPIO pin.
 * Don't worry if this looks complicated — just read the comments!
 */

#include <stdio.h>          // Needed for printf() to print text
#include "pico/stdlib.h"    // Main Pico SDK library

// The GPIO pin connected to the DS18B20 data wire
#define DS18B20_PIN 22

// --- 1-Wire Protocol Helper Functions ---
// The DS18B20 uses a specific timing protocol.
// These functions handle the low-level communication.

// Send a RESET pulse and wait for the sensor to respond
// Returns true if the sensor is present, false if not found
bool onewire_reset() {
    // Pull the pin LOW for 480 microseconds — this wakes the sensor up!
    gpio_set_dir(DS18B20_PIN, GPIO_OUT);   // Set pin as output
    gpio_put(DS18B20_PIN, 0);              // Pull LOW
    sleep_us(480);                         // Hold for 480 microseconds

    // Release the pin and wait for the sensor to respond
    gpio_set_dir(DS18B20_PIN, GPIO_IN);    // Set pin as input (releases it)
    sleep_us(70);                          // Wait 70 microseconds

    // Check if the sensor pulled the line LOW (that means "I'm here!")
    bool sensor_present = !gpio_get(DS18B20_PIN);  // LOW = sensor found
    sleep_us(410);                                  // Wait for reset to finish
    return sensor_present;                          // Return true if found
}

// Write a single bit (0 or 1) to the sensor
void onewire_write_bit(bool bit) {
    gpio_set_dir(DS18B20_PIN, GPIO_OUT);   // Set as output to send
    gpio_put(DS18B20_PIN, 0);              // Always start with a LOW pulse
    if (bit) {
        sleep_us(6);                       // Short pulse for bit = 1
        gpio_set_dir(DS18B20_PIN, GPIO_IN);// Release quickly for a 1
        sleep_us(64);                      // Wait for time slot to finish
    } else {
        sleep_us(60);                      // Long pulse for bit = 0
        gpio_set_dir(DS18B20_PIN, GPIO_IN);// Release for a 0
        sleep_us(10);                      // Short recovery time
    }
}

// Read a single bit back from the sensor
bool onewire_read_bit() {
    gpio_set_dir(DS18B20_PIN, GPIO_OUT);   // Set as output
    gpio_put(DS18B20_PIN, 0);              // Start the read slot with LOW
    sleep_us(3);                           // Very short LOW pulse
    gpio_set_dir(DS18B20_PIN, GPIO_IN);    // Release and listen
    sleep_us(10);                          // Wait a moment
    bool bit = gpio_get(DS18B20_PIN);      // Read what the sensor sent back
    sleep_us(53);                          // Wait for time slot to finish
    return bit;                            // Return the bit we read
}

// Write a full byte (8 bits) to the sensor
void onewire_write_byte(uint8_t byte) {
    for (int i = 0; i < 8; i++) {          // Loop through all 8 bits
        onewire_write_bit(byte & 0x01);    // Send the lowest bit first
        byte >>= 1;                        // Shift right to get next bit
    }
}

// Read a full byte (8 bits) from the sensor
uint8_t onewire_read_byte() {
    uint8_t byte = 0;                      // Start with zero
    for (int i = 0; i < 8; i++) {          // Read 8 bits one at a time
        if (onewire_read_bit()) {           // If bit is 1...
            byte |= (1 << i);              // Set that bit in our byte
        }
    }
    return byte;                           // Return the complete byte
}

// --- DS18B20 Specific Functions ---

// Tell the sensor to start measuring temperature
// (It takes about 750ms to finish measuring!)
void ds18b20_start_conversion() {
    onewire_reset();             // Wake up the sensor
    onewire_write_byte(0xCC);   // 0xCC = "Skip ROM" — talk to all sensors
    onewire_write_byte(0x44);   // 0x44 = "Convert T" — start measuring!
}

// Read the temperature after conversion is done
// Returns temperature as a float (e.g. 23.5 for 23.5°C)
float ds18b20_read_temperature() {
    onewire_reset();             // Wake up the sensor again
    onewire_write_byte(0xCC);   // 0xCC = "Skip ROM" — talk to all sensors
    onewire_write_byte(0xBE);   // 0xBE = "Read Scratchpad" — give me the data!

    // Read the first two bytes — these contain the temperature
    uint8_t byte1 = onewire_read_byte();   // Low byte of raw temperature
    uint8_t byte2 = onewire_read_byte();   // High byte of raw temperature

    // Combine the two bytes into one 16-bit number
    int16_t raw = (int16_t)((byte2 << 8) | byte1);

    // The DS18B20 stores temperature in units of 1/16 of a degree
    // So divide by 16 to get real Celsius temperature!
    float temperature = raw / 16.0f;

    return temperature;  // Return the temperature in Celsius
}

int main() {
    stdio_init_all();    // Start USB serial so we can print messages
    sleep_ms(2000);      // Wait 2 seconds for serial to connect

    printf("=== Lesson 21: DS18B20 Temperature Sensor ===\n");
    printf("Warming up... please wait!\n\n");

    // Set up the DS18B20 data pin
    gpio_init(DS18B20_PIN);                // Initialise pin 22
    gpio_set_dir(DS18B20_PIN, GPIO_IN);    // Start as input (released)
    gpio_pull_up(DS18B20_PIN);             // Software pull-up (backup)

    // Check if the sensor is connected
    if (!onewire_reset()) {
        // If we get here, the sensor is not found!
        printf("ERROR: DS18B20 not found! Check your wiring.\n");
        printf("Remember: you need the 4.7k resistor between DATA and 3.3V!\n");
        while (true) {
            sleep_ms(1000);  // Sit here forever if sensor not found
        }
    }
    printf("DS18B20 sensor found! Starting readings...\n\n");

    while (true) {   // Loop forever — keep taking readings!

        // Step 1: Tell the sensor to start measuring
        ds18b20_start_conversion();

        // Step 2: Wait 750ms for the sensor to finish measuring
        // (This is required! The DS18B20 needs time to measure accurately)
        sleep_ms(750);

        // Step 3: Read the temperature from the sensor
        float temp = ds18b20_read_temperature();

        // Step 4: Print the temperature to serial monitor
        printf("Temperature: %.2f C  ", temp);    // %.2f = 2 decimal places

        // Also print a fun description based on temperature!
        if (temp < 10.0f) {
            printf("(Brrr! That is cold!)\n");      // Below 10°C
        } else if (temp < 20.0f) {
            printf("(Cool and comfortable.)\n");    // 10-20°C
        } else if (temp < 30.0f) {
            printf("(Nice and warm!)\n");           // 20-30°C
        } else if (temp < 37.5f) {
            printf("(Getting hot now!)\n");         // 30-37.5°C
        } else {
            printf("(WOW, that is really hot!)\n"); // Above 37.5°C
        }

        // Wait 2 seconds before the next reading
        sleep_ms(2000);
    }

    return 0;  // We never reach this, but it is good practice
}
```

---

## 🔍 How the Code Works

1. **1-Wire reset:** The `onewire_reset()` function pulls the data pin LOW for 480 microseconds. This is like ringing the sensor's doorbell. If the sensor is there, it pulls the line LOW briefly to say "I'm home!"

2. **Writing bits:** The sensor communicates in bits (0s and 1s). A short LOW pulse means "1", a long LOW pulse means "0". The `onewire_write_bit()` function handles this timing precisely.

3. **Command bytes:** We send special command codes to the sensor. `0xCC` means "talk to whatever sensor is on the wire" and `0x44` means "start measuring temperature now!"

4. **Reading temperature:** The raw temperature value comes back as two bytes. We combine them and divide by 16 to get the real temperature in Celsius.

5. **750ms wait:** This is important! The DS18B20 needs almost a whole second to take an accurate reading. Skip this wait and you will get wrong results!

---

## 🎮 Try It!

1. **Body temperature test:** Hold the sensor between your fingers for 30 seconds. Can you see the temperature rise toward 37°C (normal body temperature)?

2. **Cold test:** Put the sensor near an ice cube (don't submerge it — keep the wires dry!). Watch the temperature drop!

3. **Warm water:** Hold the sensor near (not in!) a cup of warm tea or hot chocolate. How hot is it?

4. **Room survey:** Walk to different rooms in your house. Is one room warmer or colder? The DS18B20 will tell you exactly!

---

## 🏆 Challenge

Add a **temperature alarm**! If the temperature goes above 35°C, print "FEVER ALERT!" in big letters. Connect an LED to GP15 and make it flash when the temperature is too high. Bonus: make it beep if you have a buzzer connected to GP16!

---

## 📝 Summary

The DS18B20 is a super-accurate temperature sensor that talks to the Pico through just one data wire using the 1-Wire protocol. You learned how the sensor wakes up with a reset pulse and sends temperature data as a stream of bits that you combine into a real temperature reading. This sensor is used in real-world projects like fish tank monitors, weather stations, and even medical devices — and now you know how to use one too!
