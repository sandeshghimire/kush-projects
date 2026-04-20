# Lesson 9: DHT11 Module — Temperature and Humidity Sensor

## What you'll learn
- How the DHT11 sensor communicates using a special 1-wire timing protocol
- What "bit-banging" means and why it's useful
- How to implement a multi-byte data read using precise timing with `time_us_64()`
- How to decode sensor data using bitwise operations
- How to build a mini weather station that changes the LED colour based on conditions

## Parts you'll need
- Raspberry Pi Pico 2 W (~$7)
- Elegoo 37 Sensor Kit DHT11 Temperature & Humidity Module (included in kit)
- Elegoo 37 Sensor Kit RGB LED Module (included in kit)
- Breadboard and jumper wires (included in kit)
- USB cable to connect Pico to your computer

## Background

The **DHT11 Module** from your Elegoo kit is a little sensor that can measure temperature (0–50°C) and humidity (20–90%). Humidity is how much water vapour is in the air — on a rainy day, humidity might be 80%, while in a dry desert it might be 20%. The DHT11 is great because it's self-contained and easy to wire up: just power, ground, and one signal pin.

But here's what makes the DHT11 interesting and a little tricky: it uses a **custom 1-wire timing protocol** to send data. Instead of sending HIGH for 1 and LOW for 0 the way a button does, the DHT11 communicates by holding a pin HIGH for *different lengths of time*. A short HIGH pulse (around 26–28 microseconds) means a binary **0**. A long HIGH pulse (around 70 microseconds) means a binary **1**. It's like a drummer playing fast taps for dots and slow taps for dashes — Morse code made of timing!

To read this, you need to use a technique called **bit-banging** — you manually control and measure the pin timing in software, using precise time measurements. The Pico 2 W runs at 150 MHz (150 million ticks per second), so it can measure microsecond timings reliably. You'll use `time_us_64()` to take time snapshots and calculate how long each pulse lasts. This lesson gives you a real peek behind the curtain of how sensors talk to microcontrollers!

## Wiring

| Pico Pin | Component Pin | Component       |
|----------|---------------|-----------------|
| GP22     | S (signal)    | DHT11 Module    |
| 3V3      | VCC           | DHT11 Module    |
| GND      | GND           | DHT11 Module    |
| GP15     | R (red)       | RGB LED Module  |
| GP16     | G (green)     | RGB LED Module  |
| GP17     | B (blue)      | RGB LED Module  |
| GND      | GND           | RGB LED Module  |

> **Note:** The DHT11 Module from the Elegoo kit has a built-in pull-up resistor on the signal line, so you don't need to add an external one. Just wire S straight to GP22.

> **Note:** The DHT11 needs at least 1–2 seconds between readings. Don't try to read it faster than that — you'll get bad data or no response.

## The code

```c
/**
 * Lesson 9: DHT11 Module — Temperature and Humidity Sensor
 *
 * Reads temperature and humidity from the DHT11 Module using
 * a software bit-bang approach (manually measuring pulse widths).
 *
 * LED colour:
 *   - Too hot (temp > 28°C)    -> RED
 *   - Too humid (humid > 70%)  -> BLUE
 *   - All good                 -> GREEN
 */

#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include <stdio.h>

// --- Pin definitions ---
#define DHT_PIN    22   // DHT11 Module signal pin
#define LED_R_PIN  15   // RGB LED red
#define LED_G_PIN  16   // RGB LED green
#define LED_B_PIN  17   // RGB LED blue

// --- Helper: set RGB LED colour ---
void set_rgb(int r, int g, int b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// -----------------------------------------------
// wait_for_pin_state — waits until a pin reaches
// the desired state, or until a timeout (in us).
// Returns the number of microseconds waited,
// or -1 if timed out.
// -----------------------------------------------
static int wait_for_pin_state(uint pin, bool state, uint timeout_us) {
    uint64_t start = time_us_64();
    while (gpio_get(pin) != state) {
        if ((time_us_64() - start) > timeout_us) {
            return -1;  // timed out — sensor not responding
        }
    }
    return (int)(time_us_64() - start);
}

// -----------------------------------------------
// read_dht11 — the main DHT11 reading function
//
// Parameters:
//   pin      — which GPIO pin the DHT11 data line is on
//   temp     — pointer to float where temperature (°C) will be stored
//   humidity — pointer to float where humidity (%) will be stored
//
// Returns:
//   true  — reading was successful, temp and humidity are valid
//   false — something went wrong (sensor not responding or checksum fail)
// -----------------------------------------------
bool read_dht11(uint pin, float *temp, float *humidity) {

    uint8_t data[5] = {0, 0, 0, 0, 0};  // 5 bytes = 40 bits of DHT11 data

    // === STEP 1: Send the START signal ===
    // The Pico pulls the line LOW for at least 18 ms to wake the DHT11.
    // Then we release the line (set it HIGH) and switch to input mode.
    gpio_set_dir(pin, GPIO_OUT);
    gpio_put(pin, 0);       // pull LOW
    sleep_ms(18);           // hold LOW for 18 ms (DHT11 start condition)
    gpio_put(pin, 1);       // release HIGH
    sleep_us(30);           // wait 20-40 us before switching to input
    gpio_set_dir(pin, GPIO_IN);  // now listen for DHT11's response

    // === STEP 2: Wait for DHT11 response ===
    // The DHT11 responds by pulling LOW for ~80 us, then HIGH for ~80 us.

    // Wait for DHT11 to pull LOW (response start)
    if (wait_for_pin_state(pin, false, 100) < 0) {
        printf("DHT11: No response (LOW) - is it wired correctly?\n");
        return false;
    }
    // Wait for DHT11 to pull HIGH (response ready signal)
    if (wait_for_pin_state(pin, true, 100) < 0) {
        printf("DHT11: No response (HIGH)\n");
        return false;
    }
    // Wait for the HIGH to end (data transmission beginning)
    if (wait_for_pin_state(pin, false, 100) < 0) {
        printf("DHT11: Response HIGH did not end\n");
        return false;
    }

    // === STEP 3: Read 40 bits (5 bytes) of data ===
    // Each bit starts with a ~50 us LOW pulse (the "separator").
    // Then comes the data pulse:
    //   ~26-28 us HIGH = bit 0
    //   ~70    us HIGH = bit 1
    // We measure the length of each HIGH pulse to determine the bit value.

    for (int i = 0; i < 40; i++) {
        // Wait for the LOW separator to end (pin goes HIGH = data pulse starts)
        if (wait_for_pin_state(pin, true, 100) < 0) {
            printf("DHT11: Bit %d separator timeout\n", i);
            return false;
        }

        // Measure how long the HIGH pulse lasts
        uint64_t pulse_start = time_us_64();
        if (wait_for_pin_state(pin, false, 100) < 0) {
            printf("DHT11: Bit %d pulse timeout\n", i);
            return false;
        }
        uint64_t pulse_duration = time_us_64() - pulse_start;

        // Store the bit into the correct byte.
        // The DHT11 sends the most-significant bit first.
        // i/8 tells us which byte (0-4), i%8 tells us which bit position.
        // We shift the current byte left and OR in a 1 if pulse > 50 us.
        data[i / 8] <<= 1;
        if (pulse_duration > 50) {
            data[i / 8] |= 1;  // long pulse = bit 1
        }
        // short pulse (no OR) = bit 0
    }

    // === STEP 4: Verify the checksum ===
    // The DHT11's 5th byte is a checksum: it should equal the sum of bytes 0-3
    // (keeping only the lowest 8 bits of that sum).
    // If they don't match, the data got corrupted — throw it away!
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) {
        printf("DHT11: Checksum mismatch! Got %02X, expected %02X\n",
               data[4], checksum);
        return false;
    }

    // === STEP 5: Decode the data ===
    // Byte 0: Humidity integer part   (e.g. 45 for 45%)
    // Byte 1: Humidity decimal part   (usually 0 for DHT11)
    // Byte 2: Temperature integer part (e.g. 23 for 23°C)
    // Byte 3: Temperature decimal part (usually 0 for DHT11)
    // Byte 4: Checksum (already verified above)
    *humidity = (float)data[0] + (float)data[1] * 0.1f;
    *temp     = (float)data[2] + (float)data[3] * 0.1f;

    return true;  // success!
}

int main() {
    // -----------------------------------------------
    // 1. Start serial
    // -----------------------------------------------
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 9: DHT11 Temperature & Humidity ===\n");
    printf("Breathe on the sensor to raise the humidity!\n\n");

    // -----------------------------------------------
    // 2. Set up RGB LED
    // -----------------------------------------------
    gpio_init(LED_R_PIN);  gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN);  gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN);  gpio_set_dir(LED_B_PIN, GPIO_OUT);
    set_rgb(0, 0, 0);

    // -----------------------------------------------
    // 3. Set up DHT11 pin
    // -----------------------------------------------
    // We start it as INPUT with pull-up. The data line idles HIGH.
    // read_dht11() will switch it to OUTPUT temporarily for the start signal.
    gpio_init(DHT_PIN);
    gpio_set_dir(DHT_PIN, GPIO_IN);
    gpio_pull_up(DHT_PIN);  // idle state is HIGH

    // -----------------------------------------------
    // 4. Main loop — read every 2 seconds
    // -----------------------------------------------
    float temperature = 0.0f;
    float humidity    = 0.0f;

    while (true) {
        printf("Reading DHT11...\n");

        if (read_dht11(DHT_PIN, &temperature, &humidity)) {
            // Successful read!
            printf("Temperature: %.1f C\n", temperature);
            printf("Humidity:    %.1f %%\n\n", humidity);

            // Choose LED colour based on conditions
            if (temperature > 28.0f) {
                // Too hot -> RED
                set_rgb(1, 0, 0);
                printf("Its warm in here! [RED]\n\n");
            } else if (humidity > 70.0f) {
                // Very humid -> BLUE
                set_rgb(0, 0, 1);
                printf("Its quite humid! [BLUE]\n\n");
            } else {
                // Comfortable -> GREEN
                set_rgb(0, 1, 0);
                printf("Comfortable! [GREEN]\n\n");
            }

        } else {
            // Read failed — flash red and report
            printf("Read failed! Check wiring and try again.\n\n");
            set_rgb(1, 0, 0);
            sleep_ms(200);
            set_rgb(0, 0, 0);
        }

        // Wait 2 seconds before reading again.
        // DHT11 needs at least 1-2 seconds between reads.
        sleep_ms(2000);
    }

    return 0;
}
```

### How the code works

1. **The start signal** — The Pico drives the data pin LOW for 18 ms, then releases it. This is like knocking on the DHT11's door. The DHT11 sees this and wakes up. Then the Pico switches the pin to input mode and listens for the reply.

2. **`gpio_set_dir(pin, GPIO_OUT)` and `gpio_set_dir(pin, GPIO_IN)`** — The same physical pin changes direction during the protocol! First it's an output (to send the start signal), then it's an input (to receive the data). This is totally fine with the Pico — you can switch a pin's direction any time in code.

3. **`wait_for_pin_state()`** — A helper that watches a pin until it reaches a target state (HIGH or LOW), or gives up after a timeout. It uses `time_us_64()` to measure elapsed time in microseconds. If the sensor doesn't respond within the timeout, it returns -1 so we know something went wrong.

4. **Measuring pulse width** — For each of the 40 data bits, you measure how long the HIGH pulse lasts. You grab the time when the pulse starts (`pulse_start`), wait for it to end, then subtract. If the pulse lasted more than 50 microseconds, it's a **1 bit**. Less than 50 microseconds means a **0 bit**. The threshold of 50 us sits right between the ~28 us "zero" pulses and the ~70 us "one" pulses.

5. **`data[i / 8] <<= 1` and `data[i / 8] |= 1`** — This is *bit-banging* in action! `i / 8` picks which of the 5 bytes we're building (bits 0-7 go into byte 0, bits 8-15 into byte 1, etc.). `<<= 1` shifts the byte one position left (making room for the new bit). `|= 1` sets the lowest bit to 1 if the pulse was long. After 8 bits, each byte is complete.

6. **Checksum verification** — `data[0] + data[1] + data[2] + data[3]` should equal `data[4]`. The DHT11 calculates and appends this checksum so the receiver can detect if any bits got corrupted during transmission. If they don't match, you throw the data away rather than use bad values. This is a real technique used in all kinds of communications!

7. **`*temp = (float)data[2] + (float)data[3] * 0.1f`** — The `*` here means "store into the variable that `temp` is pointing to." This is a *pointer* — a way of returning two values from a function. `data[2]` gives the whole-number part of temperature and `data[3]` gives the decimal part (usually 0 on DHT11). So 23.0 °C is stored as `data[2]=23, data[3]=0`.

8. **Thresholds for LED** — Over 28°C turns the LED red (time to open a window!). Over 70% humidity turns it blue (very sticky feeling). Otherwise it glows a happy green.

## Try it

1. **Breathe on it:** Breathe slowly and directly on the DHT11 sensor from a few centimetres away. Your breath has high humidity. Watch the serial monitor — does the humidity number climb? Does the LED change to blue?

2. **Warm it up:** Hold the DHT11 module gently between your fingers for 30 seconds. Your body heat should slowly raise the temperature reading. Does the LED turn red?

3. **Failure mode:** Disconnect the DHT11's S wire (carefully, with the Pico powered off first). Then power the Pico back on. What message appears in the serial monitor? This is what good error handling looks like — the program tells you clearly what went wrong instead of crashing.

4. **Speed test:** Change `sleep_ms(2000)` at the bottom to `sleep_ms(500)`. What happens? Does the sensor give good readings, or do errors start showing up? Put it back to 2000 ms when you're done.

## Challenge

**Mini weather station logger!** Extend the program to keep track of the maximum and minimum temperature and humidity seen since the Pico started up. Print a table every 10 readings:

```
=== Weather Log ===
Current:  23.0 C, 55% humidity
Max temp: 26.0 C  Min temp: 21.0 C
Max humi: 72%     Min humi: 48%
Total readings: 10
===================
```

Use variables like `float max_temp = -999.0f;` (starting very low so any real reading beats it) and update them with a simple `if (temperature > max_temp)` check each loop. Then make the LED blink a special pattern (like two short flashes) whenever a new record high temperature is set!

## Summary

The DHT11 Module uses a clever timing protocol where short and long pulses represent 0s and 1s — and you decoded it yourself using `time_us_64()` to measure pulse widths down to the microsecond. The bit-shifting tricks (`<<=` and `|=`) built each data byte one bit at a time, and the checksum check made sure the data was trustworthy before using it. This pattern — start signal, wait for response, read timed bits, verify checksum — appears in dozens of real-world sensors and communication protocols!
