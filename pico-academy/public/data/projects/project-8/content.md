# Project 8: Smart Thermostat — Temperature-Controlled Fan

## What you'll learn
- How to read temperature and humidity from the DHT11 sensor using bit-bang timing
- How a rotary encoder turns rotation into digital signals your Pico can count
- What hysteresis is and why thermostats use it to avoid switching on and off too rapidly
- How a relay module switches real mains-powered devices safely using a low-power signal

---

## Parts you'll need

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

## Background

A thermostat is one of the most useful inventions in any home. It watches the temperature, compares it to a target you set, and switches heating or cooling on and off automatically to keep you comfortable. The original mechanical thermostats from the 1900s used a bimetallic strip — two metals sandwiched together that bend when heated, physically flipping a switch. Modern smart thermostats like the Google Nest do exactly the same thing in software: read a temperature sensor, compare to a setpoint, control a relay. You are building a Nest thermostat today, just without the touchscreen (although your rotary encoder knob feels surprisingly satisfying!).

The DHT11 sensor uses a clever one-wire protocol. It sends 40 bits of data — temperature and humidity — by controlling how long it holds its signal wire HIGH after each LOW pulse. A short HIGH means a zero bit; a long HIGH means a one bit. Your Pico reads those timings with microsecond precision using the hardware timer. This technique is called "bit-banging" because you are manually wiggling a pin and measuring timing instead of using a dedicated hardware peripheral. It is a great skill to have because it lets you talk to almost any sensor ever made, even ones that were invented before the Pico existed.

The relay module is the bridge between your low-power Pico world (3.3 V signals) and real appliances (5 V fans, 12 V pumps, or even mains lamps if an adult is supervising). Inside the relay is an electromagnet. When your Pico sends a HIGH signal, the electromagnet pulls a metal arm across to complete the bigger circuit. Click! The fan turns on. Send LOW, the magnet releases, the arm springs back. Click! Fan off. The hysteresis in the code means the fan turns ON only when the temperature rises more than 0.5°C above the setpoint, and turns OFF only when it drops more than 0.5°C below — this prevents the relay from chattering on and off every second when the temperature is right at the edge.

---

## Wiring

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

## The code

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

## How the code works

1. **DHT11 bit-bang protocol:** The Pico starts by pulling GP22 LOW for 20 ms — a "wake-up" signal to the sensor. The DHT11 responds with its own LOW-HIGH handshake, then streams 40 bits of data. Each bit starts with a ~50 µs LOW pulse, then a HIGH pulse. If the HIGH lasts about 26 µs it is a zero; if it lasts about 70 µs it is a one. The code samples the pin 35 µs after the HIGH starts — if the pin is still HIGH, the bit is one; if it has already gone LOW, the bit is zero. The five bytes encode humidity (integer + decimal), temperature (integer + decimal), and a checksum to verify the data arrived correctly.

2. **Rotary encoder ISR:** When the CLK pin falls (turns LOW), the ISR reads the DT pin immediately. If DT is HIGH, the encoder is rotating clockwise and the setpoint increments. If DT is LOW, it is counter-clockwise and the setpoint decrements. A 5 ms debounce prevents contact bounce from registering multiple steps per detent.

3. **Hysteresis:** Without hysteresis, if the temperature sits exactly at the setpoint the fan would switch on and off many times per second as tiny temperature fluctuations cross the line. By requiring the temperature to go 0.5°C above the setpoint before the fan turns ON, and 0.5°C below before it turns OFF, there is a 1°C "dead band" where the relay stays in whatever state it is already in. This protects the relay from wearing out quickly.

4. **RGB LED status:** The colour is determined by how far the current temperature is from the setpoint — blue means cool (below target), green means perfect (within the hysteresis band), red means hot (above target and fan running). This gives you a colour-coded thermometer at a glance.

5. **Relay control:** A single `gpio_put(PIN_RELAY, 1)` energises the relay coil, closing the NO (Normally Open) contact and completing the fan's power circuit. `gpio_put(PIN_RELAY, 0)` de-energises the coil and the spring opens the contact.

---

## Try it

1. **Warm up the sensor:** Gently hold your fingers around the DHT11 sensor (do not touch the pins!) to warm it up a couple of degrees above room temperature. Watch the serial monitor — when it crosses your setpoint + 0.5°C, the relay should click and the LED should go red.

2. **Adjust the setpoint:** Rotate the encoder knob while watching the serial monitor. The setpoint line should change in real time. Try setting it 1–2°C below room temperature — the fan should turn on immediately.

3. **Observe hysteresis in action:** Set the target to exactly the current room temperature. Watch the fan carefully over a few minutes. Does it switch on and off repeatedly, or does it stay stable? Compare this to what would happen with no dead-band (you can test that by changing `HYSTERESIS_HALF` to `0.0f` — the relay will chatter!).

4. **Humidity display:** The serial monitor also prints humidity. On a normal day it should read 40–60%. Try breathing on the DHT11 sensor — the humidity reading should jump significantly within a few seconds.

---

## Challenge

**Temperature logger:** Every time a new temperature reading comes in, add it to a circular array of the last 10 readings (a fixed-size ring buffer). After every 5 readings, calculate and print the average temperature, the minimum, and the maximum. This is exactly how data loggers work in weather stations and industrial equipment. Bonus: print a simple ASCII bar graph of the last 10 readings, where each character represents how far the temperature is from the setpoint.

---

## Summary

You built a working smart thermostat that reads real temperature data from a DHT11 sensor, lets you set a target temperature with a physical rotary encoder knob, and automatically switches a relay to control a fan — all with professional hysteresis to prevent relay chatter. You learned the DHT11 one-wire protocol, quadrature encoder decoding, relay control, and the concept of hysteresis — the same technique that every real thermostat from a cheap wall unit to a Nest uses under the hood.

---

## How this fits the Smart Home

Climate control is a core smart home function — in fact it was one of the first things people tried to automate when microcontrollers became affordable. Your thermostat (project 8) is the environmental control system for your smart home, working alongside the fire alarm (project 5) which monitors dangerous heat and the nightlight (project 1) which responds to ambient light. Your smart home now controls lighting, security, access, entertainment, and climate. That is a genuinely impressive system — well done!
