# Project 8: Smart Thermostat — Temperature-Controlled Fan

## 🎯 What You'll Learn
- How to read temperature and humidity from the DHT11 sensor
- How a rotary encoder turns rotation into signals your Pico can count
- What hysteresis is and why thermostats use it
- How a relay module switches real devices using a small signal

---

## 🛒 Parts You Need

| Part | Source | Approx. cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Store / kit | ~$7.00 |
| DHT11 Temperature & Humidity Module | Elegoo 37 Sensor Kit | included |
| Relay Module | Elegoo 37 Sensor Kit | included |
| Rotary Encoder Module | Elegoo 37 Sensor Kit | included |
| RGB LED Module | Elegoo 37 Sensor Kit | included |
| Passive Buzzer Module | Elegoo 37 Sensor Kit | included |
| Breadboard + jumper wires | Your kit | included |
| Small 5V USB fan or LED lamp (optional) | Electronics store | ~$3–$8 |

**Total extra cost beyond the kit: ~$7–$15**

---

## 🌟 Background / The Story

A thermostat is one of the coolest inventions in any home! It watches the temperature, compares it to your target, and switches the fan or heater on and off automatically. The original mechanical thermostats from the 1900s used a metal strip that bent when it got hot, physically flipping a switch. Modern smart thermostats like the Google Nest do the same thing in software! You're building a Nest thermostat today — minus the touchscreen, but with a satisfying rotary knob!

The DHT11 sensor sends temperature and humidity using clever timing — short HIGH pulses mean zero, long HIGH pulses mean one. Your Pico measures each pulse with a timer that counts in millionths of a second. This is called "bit-banging" — you manually wiggle a pin and measure timing instead of using special hardware.

The relay is a bridge between your Pico's small 3.3V world and real devices. Inside is a tiny electromagnet. When the Pico sends HIGH, the electromagnet clicks a switch closed — the fan turns on! Send LOW, the magnet releases and the fan turns off. The "hysteresis" in the code means the fan only turns on when it gets 0.5°C ABOVE your target, and only turns off when it's 0.5°C BELOW. This stops the relay from clicking rapidly back and forth when the temperature is right at the edge!

---

## 🔌 Wiring

| From | To | Notes |
|---|---|---|
| DHT11 Module S | GP22 | Single-wire data — bit-bang protocol |
| DHT11 Module VCC | 3V3 | 3.3 V power |
| DHT11 Module GND | GND | Ground |
| Relay Module S | GP15 | HIGH = relay coil energised = fan ON |
| Relay Module VCC | VBUS | 5 V from USB! Relay coil needs 5 V |
| Relay Module GND | GND | Ground |
| Rotary Encoder CLK | GP2 | Clock pulse (interrupt input) |
| Rotary Encoder DT | GP3 | Direction bit |
| Rotary Encoder SW | GP4 | Push button — resets setpoint |
| Rotary Encoder VCC | 3V3 | 3.3 V power |
| Rotary Encoder GND | GND | Ground |
| RGB LED R | GP9 | PWM red channel |
| RGB LED G | GP10 | PWM green channel |
| RGB LED B | GP11 | PWM blue channel |
| RGB LED GND | GND | Ground |
| Passive Buzzer S | GP18 | PWM for beeps |
| Passive Buzzer VCC | 3V3 | 3.3 V power |
| Passive Buzzer GND | GND | Ground |

**IMPORTANT — Relay wiring for a fan:**
Connect your fan (or lamp) between the **COM** and **NO** (Normally Open) terminals on the relay. When the relay is OFF (Pico sends LOW), COM and NO are disconnected — the fan gets no power. When the relay is ON (Pico sends HIGH), COM and NO connect and the fan runs. Never touch the relay's COM/NO/NC terminals when a mains-powered device is connected — always ask an adult to help with anything that plugs into the wall.

---

## 💻 The Code

```c
/**
 * Project 8: Smart Thermostat — Temperature-Controlled Fan
 * Build a Smart Home series — Raspberry Pi Pico 2 W, Pico SDK
 *
 * DHT11      -> GP22 (bit-bang one-wire)
 * Relay      -> GP15 (HIGH = fan ON)
 * Rotary enc -> CLK=GP2, DT=GP3, SW=GP4
 * RGB LED    -> R=GP9, G=GP10, B=GP11 (PWM)
 * Buzzer     -> GP18 (PWM)
 */

#include "pico/stdlib.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"
#include <stdio.h>

// ── Pin definitions ───────────────────────────────────────────────────────────
#define PIN_DHT11      22
#define PIN_RELAY      15
#define PIN_ENC_CLK     2
#define PIN_ENC_DT      3
#define PIN_ENC_SW      4
#define PIN_LED_R       9
#define PIN_LED_G      10
#define PIN_LED_B      11
#define PIN_BUZZER     18

// ── Thermostat settings ───────────────────────────────────────────────────────
#define SETPOINT_DEFAULT  25    // Starting target temperature (°C)
#define SETPOINT_MIN      15    // Minimum setpoint
#define SETPOINT_MAX      35    // Maximum setpoint
#define HYSTERESIS_HALF   0.5f  // Fan ON above setpoint+0.5, OFF below setpoint-0.5
#define READ_INTERVAL_MS  2000  // Read DHT11 every 2 seconds

// ── Rotary encoder state (modified by ISR) ────────────────────────────────────
volatile int setpoint     = SETPOINT_DEFAULT;
volatile int enc_last_clk = 1;
volatile uint64_t enc_last_us = 0;
#define ENC_DEBOUNCE_US 5000   // 5 ms debounce

// ── Encoder ISR: fires on falling edge of CLK ─────────────────────────────────
void encoder_isr(uint gpio, uint32_t events) {
    uint64_t now = time_us_64();
    if (now - enc_last_us < ENC_DEBOUNCE_US) return;
    enc_last_us = now;

    // Read DT immediately after CLK falls
    int dt = gpio_get(PIN_ENC_DT);

    // If DT is HIGH when CLK falls: clockwise (increment)
    // If DT is LOW  when CLK falls: counter-clockwise (decrement)
    if (dt == 1) {
        if (setpoint < SETPOINT_MAX) setpoint++;
    } else {
        if (setpoint > SETPOINT_MIN) setpoint--;
    }
}

// ── PWM helpers ───────────────────────────────────────────────────────────────
void pwm_init_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(pin), 0);
}

void set_brightness(uint pin, uint8_t v) {
    pwm_set_chan_level(pwm_gpio_to_slice_num(pin), pwm_gpio_to_channel(pin), v);
}

void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    set_brightness(PIN_LED_R, r);
    set_brightness(PIN_LED_G, g);
    set_brightness(PIN_LED_B, b);
}

// ── Buzzer beep ───────────────────────────────────────────────────────────────
void beep(uint freq_hz, int ms) {
    uint slice = pwm_gpio_to_slice_num(PIN_BUZZER);
    uint chan  = pwm_gpio_to_channel(PIN_BUZZER);
    // Pico at 125 MHz; divider 8 gives 15.625 MHz tick
    pwm_set_clkdiv(slice, 8.0f);
    uint32_t wrap = 15625000 / freq_hz;
    if (wrap > 65535) wrap = 65535;
    pwm_set_wrap(slice, (uint16_t)wrap);
    pwm_set_chan_level(slice, chan, (uint16_t)(wrap / 2));
    pwm_set_enabled(slice, true);
    sleep_ms(ms);
    pwm_set_chan_level(slice, chan, 0);
}

// ── DHT11 bit-bang reader ─────────────────────────────────────────────────────
// Returns true on success. Fills *temp_c and *humidity_rh.
// Protocol:
//   Host pulls LOW for >=18 ms (start signal)
//   Host releases, DHT11 responds: LOW ~80µs, HIGH ~80µs
//   Then 40 bits: each bit = LOW ~50µs then HIGH (~26µs=0, ~70µs=1)
//   Data order: RH-int, RH-dec, T-int, T-dec, checksum
bool dht11_read(float *temp_c, float *humidity_rh) {
    uint8_t data[5] = {0};

    // ── Send start signal ─────────────────────────────────────────────────────
    gpio_set_dir(PIN_DHT11, GPIO_OUT);
    gpio_put(PIN_DHT11, 0);
    sleep_ms(20);           // Pull LOW for 20 ms (spec: >=18 ms)
    gpio_put(PIN_DHT11, 1);
    sleep_us(40);
    gpio_set_dir(PIN_DHT11, GPIO_IN);

    // ── Wait for DHT11 response: LOW ──────────────────────────────────────────
    uint32_t timeout = 0;
    while (gpio_get(PIN_DHT11) == 1) {
        sleep_us(1);
        if (++timeout > 100) return false;   // No response
    }

    // ── Wait for response LOW to end ──────────────────────────────────────────
    timeout = 0;
    while (gpio_get(PIN_DHT11) == 0) {
        sleep_us(1);
        if (++timeout > 100) return false;
    }

    // ── Wait for response HIGH to end ─────────────────────────────────────────
    timeout = 0;
    while (gpio_get(PIN_DHT11) == 1) {
        sleep_us(1);
        if (++timeout > 100) return false;
    }

    // ── Read 40 bits ──────────────────────────────────────────────────────────
    for (int i = 0; i < 40; i++) {
        // Each bit starts with a ~50µs LOW
        timeout = 0;
        while (gpio_get(PIN_DHT11) == 0) {
            sleep_us(1);
            if (++timeout > 100) return false;
        }

        // Then HIGH: measure how long
        sleep_us(35);   // Wait past the ~26µs for a '0' bit

        int bit_val = gpio_get(PIN_DHT11);  // Still HIGH? Then it's a '1' (~70µs)

        // Wait for HIGH to end
        timeout = 0;
        while (gpio_get(PIN_DHT11) == 1) {
            sleep_us(1);
            if (++timeout > 100) return false;
        }

        // Store bit (MSB first within each byte)
        data[i / 8] <<= 1;
        if (bit_val) data[i / 8] |= 1;
    }

    // ── Verify checksum ───────────────────────────────────────────────────────
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) return false;

    *humidity_rh = (float)data[0];       // Integer part (DHT11 gives whole numbers)
    *temp_c      = (float)data[2];

    return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);

    printf("================================================\n");
    printf("  Project 8: Smart Thermostat\n");
    printf("  Smart Home Series — Pico 2 W\n");
    printf("================================================\n\n");

    // ── Relay output ──────────────────────────────────────────────────────────
    gpio_init(PIN_RELAY);
    gpio_set_dir(PIN_RELAY, GPIO_OUT);
    gpio_put(PIN_RELAY, 0);   // Fan OFF at startup

    // ── RGB LED PWM ───────────────────────────────────────────────────────────
    pwm_init_pin(PIN_LED_R);
    pwm_init_pin(PIN_LED_G);
    pwm_init_pin(PIN_LED_B);

    // ── Buzzer PWM ────────────────────────────────────────────────────────────
    gpio_set_function(PIN_BUZZER, GPIO_FUNC_PWM);

    // ── Rotary encoder ────────────────────────────────────────────────────────
    gpio_init(PIN_ENC_CLK);
    gpio_set_dir(PIN_ENC_CLK, GPIO_IN);
    gpio_pull_up(PIN_ENC_CLK);

    gpio_init(PIN_ENC_DT);
    gpio_set_dir(PIN_ENC_DT, GPIO_IN);
    gpio_pull_up(PIN_ENC_DT);

    gpio_init(PIN_ENC_SW);
    gpio_set_dir(PIN_ENC_SW, GPIO_IN);
    gpio_pull_up(PIN_ENC_SW);

    // Interrupt on CLK falling edge to detect rotation
    gpio_set_irq_enabled_with_callback(
        PIN_ENC_CLK,
        GPIO_IRQ_EDGE_FALL,
        true,
        &encoder_isr
    );

    // ── DHT11 pin starts as input ─────────────────────────────────────────────
    gpio_init(PIN_DHT11);
    gpio_set_dir(PIN_DHT11, GPIO_IN);

    // ── Startup blink ─────────────────────────────────────────────────────────
    set_rgb(0, 0, 255);
    beep(523, 100);
    beep(659, 100);
    beep(784, 150);
    set_rgb(0, 0, 0);
    sleep_ms(300);

    printf("Thermostat ready!\n");
    printf("Rotate the encoder knob to set your target temperature.\n");
    printf("Push the encoder button to reset to 25 C.\n\n");

    float    current_temp     = 0.0f;
    float    current_humidity = 0.0f;
    bool     fan_on           = false;
    bool     read_ok          = false;
    uint64_t last_read_ms     = 0;

    while (true) {
        uint64_t now_ms = to_ms_since_boot(get_absolute_time());

        // ── Read encoder button (SW LOW when pressed) ─────────────────────────
        if (gpio_get(PIN_ENC_SW) == 0) {
            setpoint = SETPOINT_DEFAULT;
            printf("Setpoint reset to %d C\n", setpoint);
            beep(1047, 80);
            sleep_ms(300);   // Simple debounce for the button
        }

        // ── Read DHT11 every READ_INTERVAL_MS ────────────────────────────────
        if (now_ms - last_read_ms >= READ_INTERVAL_MS) {
            last_read_ms = now_ms;
            read_ok = dht11_read(&current_temp, &current_humidity);

            if (!read_ok) {
                printf("DHT11 read failed — check wiring. Retrying...\n");
            }
        }

        // ── Thermostat logic with hysteresis ──────────────────────────────────
        if (read_ok) {
            int sp = setpoint;   // Local copy (volatile, so grab once)

            bool new_fan_state = fan_on;   // Default: keep current state

            if (current_temp > (float)sp + HYSTERESIS_HALF) {
                new_fan_state = true;    // Too hot: fan ON
            } else if (current_temp < (float)sp - HYSTERESIS_HALF) {
                new_fan_state = false;   // Cool enough: fan OFF
            }
            // Between sp-0.5 and sp+0.5: do nothing (hysteresis dead-band)

            // Beep and print when fan state changes
            if (new_fan_state != fan_on) {
                fan_on = new_fan_state;
                gpio_put(PIN_RELAY, fan_on ? 1 : 0);

                if (fan_on) {
                    printf(">>> Fan ON  (%.1f C > %d C + %.1f)\n",
                           current_temp, sp, HYSTERESIS_HALF);
                    beep(880, 80);
                    beep(1047, 100);
                } else {
                    printf(">>> Fan OFF (%.1f C < %d C - %.1f)\n",
                           current_temp, sp, HYSTERESIS_HALF);
                    beep(523, 80);
                    beep(440, 100);
                }
            }

            // ── RGB LED status indicator ──────────────────────────────────────
            float diff = current_temp - (float)sp;
            if (diff > HYSTERESIS_HALF) {
                set_rgb(255, 0, 0);        // Red: too hot, fan running
            } else if (diff < -HYSTERESIS_HALF) {
                set_rgb(0, 0, 200);        // Blue: below target, nice and cool
            } else {
                set_rgb(0, 220, 0);        // Green: spot on!
            }

            // ── Status line to serial monitor ─────────────────────────────────
            printf("Set: %d C  |  Current: %.1f C  |  Humidity: %.0f%%  |  Fan: %s\n",
                   sp,
                   current_temp,
                   current_humidity,
                   fan_on ? "ON" : "OFF");
        }

        sleep_ms(200);
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **DHT11 bit-bang** — The Pico pulls GP22 LOW for 20ms as a "wake-up" signal. The DHT11 responds with 40 bits of data. Short HIGH pulses (~26µs) = zero, long HIGH pulses (~70µs) = one. The code samples the pin 35µs after HIGH starts — still HIGH means one, already LOW means zero. A checksum at the end verifies the data!

2. **Rotary encoder ISR** — When the CLK pin falls, the ISR instantly reads the DT pin. DT HIGH = clockwise (setpoint goes up). DT LOW = counter-clockwise (setpoint goes down). A 5ms debounce stops false counts.

3. **Hysteresis** — Without hysteresis, the fan would click on and off rapidly when the temperature is exactly at the target! The 0.5°C "dead band" means the fan turns ON only when it's 0.5°C above target, and turns OFF only when it's 0.5°C below. This protects the relay and is how EVERY real thermostat works!

4. **RGB LED status** — Blue = cool (below target). Green = perfect (within dead band). Red = hot (fan running). A color-coded thermometer at a glance!

5. **Relay control** — `gpio_put(PIN_RELAY, 1)` closes the relay and powers the fan. `gpio_put(PIN_RELAY, 0)` opens it and stops the fan. One line of code controls a real electrical device!

---

## 🎮 Try It!

1. **Warm up the sensor** — Gently hold your fingers around the DHT11 (don't touch the pins!). When the temperature crosses your setpoint + 0.5°C, the relay should click and the LED go red!

2. **Adjust the setpoint** — Rotate the encoder knob and watch the setpoint change in real time on the serial monitor. Set it 1-2°C below room temperature — the fan should turn on immediately!

3. **Observe hysteresis** — Set the target to exactly room temperature. Does the fan click rapidly or stay stable? Try changing `HYSTERESIS_HALF` to `0.0f` — the relay will chatter! Change it back to see how hysteresis prevents this.

4. **Humidity display** — Breathe slowly on the DHT11 sensor. The humidity reading should jump within a few seconds! Your breath is warm and moist!

---

## 🏆 Challenge

Build a temperature logger! Every time a new reading comes in, add it to a circular array of the last 10 readings. After every 5 readings, calculate and print the average, minimum, and maximum temperature. Print a simple ASCII bar graph! This is exactly how weather stations work!

---

## 📝 Summary

You built a working smart thermostat! It reads temperature from the DHT11, lets you set a target with a rotary knob, and automatically switches a relay to control a fan — with professional hysteresis to prevent rapid clicking. The same hysteresis technique is in every real thermostat from cheap wall units to Google Nest!
