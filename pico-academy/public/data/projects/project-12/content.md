# Project 12: Plant Health Monitor — Is Your Plant Happy?

## What you'll learn
- How to read temperature and humidity from a DHT11 sensor using bit-banging
- How to read light levels from a photoresistor using the Pico's ADC
- How to make decisions based on multiple sensor readings at once
- How to give status feedback using LED colours and buzzer sounds
- How to build a repeating reporting system using timers

## Parts you'll need (with costs + total)

| Part | Where it comes from | Approximate cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Your kit / bought separately | $7.00 |
| DHT11 Temperature & Humidity Module | Elegoo 37 Sensor Kit | included |
| Photoresistor Module | Elegoo 37 Sensor Kit | included |
| RGB LED Module | Elegoo 37 Sensor Kit | included |
| Passive Buzzer Module | Elegoo 37 Sensor Kit | included |
| Breadboard + jumper wires | Your kit | included |

**Estimated total (if buying everything new):** ~$18–$22

## Background

Plants are pickier than you might think! Most houseplants — like pothos, peace lilies, and spider plants — have a "Goldilocks zone" for their environment. They love temperatures between about 18°C and 28°C (around 64–82°F), humidity between 40% and 70%, and several hours of decent light per day. Too hot and their leaves dry out and curl. Too dark and they stop making food through photosynthesis. Too wet in the air and mould can grow. They literally cannot tell you what is wrong — so you are going to build them a voice!

Professional farmers and greenhouse managers use computer-controlled climate systems worth tens of thousands of dollars to keep their plants in exactly the right conditions. They monitor temperature, humidity, CO2 levels, soil moisture, and light intensity around the clock. Your plant monitor does three of those five things with hardware that costs a few dollars — that is genuinely impressive engineering for a beginner!

Some modern smart plant pots (like the Xiaomi Mi Flora) do something very similar and sell for $15–$30 each. The sensor inside works on the same principle as your DHT11 and photoresistor. The main difference? You understand how yours works, and you built it yourself.

## Wiring

| From | To | Notes |
|---|---|---|
| DHT11 **S** | GP22 | Single-wire data (bit-bang) |
| DHT11 **VCC** | 3V3 | 3.3 V power |
| DHT11 **GND** | GND | Ground |
| Photoresistor **A** | GP26 | ADC channel 0 (analog) |
| Photoresistor **VCC** | 3V3 | 3.3 V power |
| Photoresistor **GND** | GND | Ground |
| RGB LED **R** | GP9 | PWM — red channel |
| RGB LED **G** | GP10 | PWM — green channel |
| RGB LED **B** | GP11 | PWM — blue channel |
| RGB LED **GND** | GND | Common cathode |
| Passive Buzzer **S** | GP18 | PWM — tone output |
| Passive Buzzer **VCC** | 3V3 | 3.3 V power |
| Passive Buzzer **GND** | GND | Ground |

> **Note:** GP26 is also called ADC0 on the Pico. The photoresistor module gives a voltage between 0 V (pitch dark) and 3.3 V (very bright), which the ADC turns into a number from 0 to 4095.

## The code

```c
/**
 * Project 12: Plant Health Monitor — Is Your Plant Happy?
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Reads temperature + humidity from DHT11 and light level
 * from a photoresistor. Shows plant status on an RGB LED
 * and plays a distress sound if conditions are poor.
 * Prints a full status report to serial every 5 seconds.
 */

#include <stdio.h>
#include <math.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define PIN_DHT11    22   // DHT11 data
#define PIN_PHOTO    26   // Photoresistor (ADC0)
#define ADC_CHANNEL   0   // ADC channel for GP26
#define PIN_RED       9   // RGB LED red   (PWM)
#define PIN_GREEN    10   // RGB LED green (PWM)
#define PIN_BLUE     11   // RGB LED blue  (PWM)
#define PIN_BUZZER   18   // Passive buzzer (PWM)

// ── Plant "Goldilocks" thresholds — edit these to match your plant! ───────────
#define TEMP_MIN    18.0f   // Too cold below this (°C)
#define TEMP_MAX    28.0f   // Too hot above this  (°C)
#define HUMID_MIN   40      // Too dry below this  (%)
#define HUMID_MAX   70      // Too wet above this  (%)
#define LIGHT_MIN  1500     // Too dark below this  (ADC 0-4095)
#define LIGHT_MAX  3800     // Too bright above this (ADC 0-4095)

// ── Reporting interval ───────────────────────────────────────────────────────
#define REPORT_INTERVAL_MS   5000    // Print report every 5 seconds
#define ALERT_INTERVAL_MS   30000    // Play distress sound every 30 seconds

// ── DHT11 timing (microseconds) ──────────────────────────────────────────────
#define DHT_START_LOW_MS    18       // Host pulls low for 18ms to start
#define DHT_TIMEOUT_US    1000       // Bail out if signal sticks (broken sensor)

// ── PWM helper ───────────────────────────────────────────────────────────────
void pwm_setup(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
}

void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_chan_level(pwm_gpio_to_slice_num(PIN_RED),
                      pwm_gpio_to_channel(PIN_RED),   r);
    pwm_set_chan_level(pwm_gpio_to_slice_num(PIN_GREEN),
                      pwm_gpio_to_channel(PIN_GREEN), g);
    pwm_set_chan_level(pwm_gpio_to_slice_num(PIN_BLUE),
                      pwm_gpio_to_channel(PIN_BLUE),  b);
}

// ── Buzzer tone helper ────────────────────────────────────────────────────────
// Plays a tone on the passive buzzer for 'duration_ms' milliseconds.
// freq_hz = 0 turns it off.
void buzzer_tone(uint freq_hz, uint duration_ms) {
    uint slice = pwm_gpio_to_slice_num(PIN_BUZZER);
    if (freq_hz == 0) {
        pwm_set_enabled(slice, false);
        sleep_ms(duration_ms);
        return;
    }
    // Calculate clock divider + wrap for desired frequency
    // Pico system clock = 125 MHz
    uint32_t sys_clock = 125000000;
    uint32_t wrap      = sys_clock / freq_hz - 1;
    if (wrap > 65535) wrap = 65535;   // Clamp to 16-bit register

    pwm_set_wrap(slice, (uint16_t)wrap);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(PIN_BUZZER), wrap / 2);
    pwm_set_enabled(slice, true);
    sleep_ms(duration_ms);
    pwm_set_enabled(slice, false);
}

// Play a sad three-note "help me" sound
void play_plant_distress(void) {
    buzzer_tone(440, 200);   // A4
    sleep_ms(50);
    buzzer_tone(330, 200);   // E4
    sleep_ms(50);
    buzzer_tone(262, 400);   // C4 — lower, sadder
    sleep_ms(100);
}

// ── DHT11 bit-bang reader ─────────────────────────────────────────────────────
// Returns true if read succeeded. Fills temp_c and humidity.
bool dht11_read(float *temp_c, int *humidity) {
    uint8_t data[5] = {0, 0, 0, 0, 0};

    // Step 1: Host sends start signal — pull LOW for 18ms, then release
    gpio_set_dir(PIN_DHT11, GPIO_OUT);
    gpio_put(PIN_DHT11, 0);
    sleep_ms(DHT_START_LOW_MS);
    gpio_put(PIN_DHT11, 1);
    sleep_us(30);

    // Step 2: Switch to input and wait for sensor response
    gpio_set_dir(PIN_DHT11, GPIO_IN);
    gpio_pull_up(PIN_DHT11);

    // Sensor pulls LOW (~80us) then HIGH (~80us) as handshake
    uint64_t t = time_us_64();
    while (!gpio_get(PIN_DHT11)) {   // Wait for LOW to end
        if (time_us_64() - t > DHT_TIMEOUT_US) return false;
    }
    t = time_us_64();
    while (gpio_get(PIN_DHT11)) {    // Wait for HIGH to end
        if (time_us_64() - t > DHT_TIMEOUT_US) return false;
    }

    // Step 3: Read 40 bits (5 bytes) — each bit is a LOW then HIGH pulse
    // SHORT high pulse (~28us) = 0
    // LONG  high pulse (~70us) = 1
    for (int byte_idx = 0; byte_idx < 5; byte_idx++) {
        for (int bit_idx = 7; bit_idx >= 0; bit_idx--) {
            // Wait for LOW phase to end
            t = time_us_64();
            while (!gpio_get(PIN_DHT11)) {
                if (time_us_64() - t > DHT_TIMEOUT_US) return false;
            }
            // Measure how long HIGH phase lasts
            t = time_us_64();
            while (gpio_get(PIN_DHT11)) {
                if (time_us_64() - t > DHT_TIMEOUT_US) return false;
            }
            uint64_t pulse_len = time_us_64() - t;
            // HIGH > 40us means the bit is 1
            if (pulse_len > 40) {
                data[byte_idx] |= (1 << bit_idx);
            }
        }
    }

    // Step 4: Verify checksum (last byte = sum of first four, low 8 bits)
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) {
        printf("[DHT11] Checksum mismatch! Got %d, expected %d\n",
               data[4], checksum);
        return false;
    }

    // Step 5: Extract values
    // data[0] = humidity integer part
    // data[2] = temperature integer part
    // data[1] and data[3] are decimal parts (DHT11 always sends 0 for these)
    *humidity = data[0];
    *temp_c   = (float)data[2];
    return true;
}

// ── Status assessment ─────────────────────────────────────────────────────────
typedef enum {
    STATUS_HAPPY = 0,   // All readings in range
    STATUS_CHECK,       // One reading is off
    STATUS_HELP,        // Two or more readings are off
    STATUS_TOO_DARK,    // Light is below minimum
    STATUS_TOO_BRIGHT,  // Light is above maximum
} PlantStatus;

PlantStatus assess_plant(float temp, int humidity, uint16_t light,
                         bool *temp_ok, bool *humid_ok, bool *light_ok) {
    *temp_ok  = (temp  >= TEMP_MIN  && temp  <= TEMP_MAX);
    *humid_ok = (humidity >= HUMID_MIN && humidity <= HUMID_MAX);
    *light_ok = (light >= LIGHT_MIN && light <= LIGHT_MAX);

    int problems = (!*temp_ok ? 1 : 0) + (!*humid_ok ? 1 : 0);

    // Light has special states
    if (light < LIGHT_MIN) return STATUS_TOO_DARK;
    if (light > LIGHT_MAX) return STATUS_TOO_BRIGHT;

    // Otherwise count temperature + humidity problems
    if (problems == 0) return STATUS_HAPPY;
    if (problems == 1) return STATUS_CHECK;
    return STATUS_HELP;
}

void apply_status_led(PlantStatus status) {
    switch (status) {
        case STATUS_HAPPY:      set_rgb(  0, 200,   0); break;   // Green
        case STATUS_CHECK:      set_rgb(200, 200,   0); break;   // Yellow
        case STATUS_HELP:       set_rgb(255,   0,   0); break;   // Red
        case STATUS_TOO_DARK:   set_rgb(  0,   0, 200); break;   // Blue
        case STATUS_TOO_BRIGHT: set_rgb(200,   0, 200); break;   // Magenta
    }
}

const char *status_string(PlantStatus s) {
    switch (s) {
        case STATUS_HAPPY:      return "HAPPY";
        case STATUS_CHECK:      return "CHECK IT";
        case STATUS_HELP:       return "NEEDS HELP";
        case STATUS_TOO_DARK:   return "TOO DARK";
        case STATUS_TOO_BRIGHT: return "TOO BRIGHT";
        default:                return "UNKNOWN";
    }
}

// ── main ──────────────────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(1500);

    printf("\n=========================================\n");
    printf("  Project 12: Plant Health Monitor\n");
    printf("=========================================\n");
    printf("Monitoring temperature, humidity, and light.\n");
    printf("Status is shown on the LED. Report every 5s.\n\n");

    // ── ADC for photoresistor ─────────────────────────────────────────────────
    adc_init();
    adc_gpio_init(PIN_PHOTO);
    adc_select_input(ADC_CHANNEL);

    // ── DHT11 pin — starts as input with pull-up ──────────────────────────────
    gpio_init(PIN_DHT11);
    gpio_set_dir(PIN_DHT11, GPIO_IN);
    gpio_pull_up(PIN_DHT11);

    // ── PWM for RGB LED ───────────────────────────────────────────────────────
    pwm_setup(PIN_RED);
    pwm_setup(PIN_GREEN);
    pwm_setup(PIN_BLUE);

    // ── PWM for passive buzzer ────────────────────────────────────────────────
    gpio_set_function(PIN_BUZZER, GPIO_FUNC_PWM);

    // ── Timers ────────────────────────────────────────────────────────────────
    uint64_t last_report_us = 0;
    uint64_t last_alert_us  = 0;

    // Sensor reading storage
    float    temp      = 0.0f;
    int      humidity  = 0;
    bool     dht_ok    = false;

    set_rgb(0, 0, 50);   // Dim blue startup glow while we settle
    sleep_ms(2000);      // DHT11 needs 2s after power-up before first read

    printf("Ready! Watching your plant...\n\n");

    while (true) {
        uint64_t now = time_us_64();

        // ── Read sensors every 5 seconds ──────────────────────────────────────
        if ((now - last_report_us) >= (REPORT_INTERVAL_MS * 1000ULL)) {
            last_report_us = now;

            // Read DHT11 — must wait at least 2 seconds between reads
            dht_ok = dht11_read(&temp, &humidity);

            // Read photoresistor via ADC
            adc_select_input(ADC_CHANNEL);
            uint16_t light = adc_read();   // 0 (dark) to 4095 (bright)

            // Assess plant health
            bool temp_ok, humid_ok, light_ok;
            PlantStatus status;

            if (!dht_ok) {
                // Sensor read failed — blink magenta and report
                set_rgb(200, 0, 200);
                printf("[ERROR] DHT11 read failed. Check wiring!\n");
                sleep_ms(100);
            } else {
                status = assess_plant(temp, humidity, light,
                                      &temp_ok, &humid_ok, &light_ok);
                apply_status_led(status);

                // ── Print plant report ────────────────────────────────────────
                printf("=== Plant Report ===\n");
                printf("  Temperature : %.1f C  %s  (ideal: %.0f-%.0f C)\n",
                       temp,
                       temp_ok  ? "[OK]"  : "[!]",
                       TEMP_MIN, TEMP_MAX);
                printf("  Humidity    : %d%%  %s  (ideal: %d-%d%%)\n",
                       humidity,
                       humid_ok ? "[OK]"  : "[!]",
                       HUMID_MIN, HUMID_MAX);
                printf("  Light level : %d  %s  (ideal: %d-%d)\n",
                       light,
                       light_ok ? "[OK]"  : "[!]",
                       LIGHT_MIN, LIGHT_MAX);
                printf("  Status      : %s\n\n", status_string(status));

                // ── Play distress sound every 30s if plant needs help ─────────
                if (status != STATUS_HAPPY &&
                    (now - last_alert_us) >= (ALERT_INTERVAL_MS * 1000ULL)) {
                    last_alert_us = now;
                    printf("[ALERT] Plant needs attention! Playing distress sound...\n\n");
                    play_plant_distress();
                }
            }
        }

        sleep_ms(100);   // Don't hog the CPU
    }

    return 0;
}
```

## How the code works

1. **DHT11 bit-bang** — The DHT11 uses a special one-wire protocol. The Pico pulls the data line LOW for 18 ms to tell the sensor "start transmitting!" then switches to input mode. The sensor responds with 40 bits of data. Short HIGH pulses mean 0, long HIGH pulses (over 40 microseconds) mean 1. The `time_us_64()` function measures pulse lengths precisely. A checksum at the end catches any errors.

2. **ADC for light** — `adc_read()` returns a number from 0 (complete darkness) to 4095 (maximum brightness). The photoresistor has lower resistance in bright light, which raises the voltage on GP26, which gives a higher ADC reading. More light = higher number.

3. **Status enum** — `PlantStatus` gives meaningful names to each possible condition. The `assess_plant()` function checks each reading against the thresholds and counts how many are out of range. It also handles the special "too dark" and "too bright" light states with their own colours.

4. **LED status colours** — Green means happy. Yellow means one thing is off. Red means two or more things are wrong. Blue means it is too dark. Magenta means too bright. These five colours give you an instant visual answer from across the room.

5. **Distress sound** — If any condition is bad, and 30 seconds have passed since the last alert, `play_plant_distress()` plays three descending notes on the passive buzzer. The passive buzzer needs a PWM signal to make sound — `buzzer_tone()` calculates the right wrap value for the desired frequency automatically.

6. **Timer pattern** — Instead of using `sleep_ms(5000)` which would freeze the whole program, the code compares `time_us_64()` to timestamps stored from the last event. This "non-blocking" style means you could add more features without slowing down the reports.

## Try it

1. **Cover the photoresistor completely with your hand.** Watch the LED turn blue (too dark) and see "TOO DARK" in the serial report. Uncover it and point a flashlight at it — does it go magenta (too bright)?

2. **Breathe gently and slowly on the DHT11 sensor** for about 10 seconds. Your breath is warm and humid — you should see the temperature and humidity readings climb in the next report.

3. **Change `TEMP_MIN` to 30.0f in the code** and re-upload. Now any normal room temperature will look "too cold" to the plant. Watch the LED turn yellow or red. Change it back afterwards!

4. **Put the sensor in a sunlit window vs a dark corner** of the room. Print out both sets of readings and compare the light values. What is the difference?

## Challenge

Add a **soil moisture sensor** (or simulate one with a spare wire dipped in a glass of water touching GP27). Read it with `adc_read()` on ADC channel 1, set thresholds for "too dry" and "too wet," and add a new `STATUS_DRY` and `STATUS_SOGGY` to the status enum. Update the LED colours and the report printout to include soil moisture. Now you have a four-sensor plant monitor!

## Summary

You built a three-sensor plant health monitor that checks temperature, humidity, and light level every five seconds and displays the result as a colour-coded LED — green for happy, yellow for check it, red for help, blue for too dark, and magenta for too bright. When conditions stay bad, the passive buzzer plays a little distress melody. Real commercial plant monitors use the same sensors and the same decision-making logic.

## How this fits the Smart Home

Your Smart Home now has a way to monitor living things — not just switches and alarms. In a real smart home, this kind of environmental monitor could send you a notification on your phone when the plant needs water or the room gets too hot. You have built the sensor and decision-making layer; adding WiFi (the Pico 2 W has it!) is the next step to making it truly wireless.
