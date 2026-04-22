# Lesson 37: Grand Finale — Build Your Own Mini Weather Station!

## 🎯 What You'll Learn

- How to combine multiple sensors in one program
- How to read temperature, humidity, light level, and sound all at once
- How to display information clearly using printf
- How to use the Pico W's Wi-Fi to send data to a webpage (bonus!)
- How all the skills you have learned come together in a real project

---

## 🛒 Parts You Need

- Raspberry Pi Pico 2 W (~$6)
- DHT11 Temperature & Humidity Sensor Module (from Elegoo kit)
- Photoresistor / Light Sensor Module (from Elegoo kit)
- Sound Sensor Module (from Elegoo kit)
- Active Buzzer Module (from Elegoo kit)
- 3× LEDs (red, yellow, green) + 3× 220Ω resistors
- Breadboard and jumper wires
- USB cable

---

## 🌟 Background — You Have Come So Far!

Look at how far you have come! You started with a blinking LED — one little light flickering on and off. Now you can read temperatures, detect sound, feel vibrations, measure light, send infrared signals, and even talk to the internet with Wi-Fi!

This final lesson puts it all together. You are going to build a **Mini Weather Station** — a real gadget that reads the environment around you every few seconds and reports back with:

- 🌡️ The temperature (is it hot or cold in the room?)
- 💧 The humidity (is the air wet or dry?)
- ☀️ The light level (is it day or night?)
- 🔊 The noise level (is it quiet or loud?)

Real weather stations work exactly like this. They sit on rooftops or in fields and measure the environment constantly, sending data to computers all over the world. Those computers use the data to make the weather forecasts you see on TV!

The most important skill in this lesson is not a new one — it is **combining** the things you already know. A buzzer you learned in Lesson 4. A photoresistor from Lesson 6. DHT11 from Lesson 9. Sound sensor from Lesson 7. In engineering, combining simple parts to make something smart is called **integration** — and it is one of the most valuable skills a programmer can have!

---

## 🔌 Wiring

| Module / Component      | Pico 2 W Pin | Notes                           |
| ----------------------- | ------------ | ------------------------------- |
| DHT11 Module VCC        | 3V3          | Power                           |
| DHT11 Module GND        | GND          | Ground                          |
| DHT11 Module DATA       | GP14         | Digital data signal             |
| Light Sensor Module VCC | 3V3          | Power                           |
| Light Sensor Module GND | GND          | Ground                          |
| Light Sensor Module A   | GP26         | Analog output — ADC channel 0   |
| Sound Sensor Module VCC | 3V3          | Power                           |
| Sound Sensor Module GND | GND          | Ground                          |
| Sound Sensor Module DO  | GP15         | Digital output (HIGH when loud) |
| Active Buzzer +         | GP16         | Buzzer signal                   |
| Active Buzzer -         | GND          | Ground                          |
| Green LED (via 220Ω)    | GP13         | All OK indicator                |
| Yellow LED (via 220Ω)   | GP12         | Warning indicator               |
| Red LED (via 220Ω)      | GP11         | Alert indicator                 |

> **Tip:** The Pico has lots of GND pins — use the one nearest each module to keep your wires tidy!

---

## 💻 The Code

```c
/**
 * Lesson 37: Grand Finale — Mini Weather Station
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Reads temperature, humidity, light, and sound.
 * Displays a simple dashboard on the serial terminal.
 * Lights LEDs and sounds buzzer based on readings.
 *
 * This program combines skills from lessons 4, 6, 7, and 9!
 */

#include "pico/stdlib.h"      // Standard Pico stuff
#include "hardware/adc.h"     // For reading the light sensor analog value
#include <stdio.h>            // For printf

// ── Pin definitions ───────────────────────────────────────────────────────────
#define DHT11_PIN     14    // DHT11 temperature & humidity sensor
#define LIGHT_ADC_PIN 26    // Photoresistor analog input (ADC channel 0)
#define SOUND_PIN     15    // Sound sensor digital output
#define BUZZER_PIN    16    // Active buzzer
#define LED_GREEN     13    // Green  = all good
#define LED_YELLOW    12    // Yellow = warning (hot or bright)
#define LED_RED       11    // Red    = alert (too hot or too loud!)

// ── Weather thresholds — change these to suit your room! ─────────────────────
#define TEMP_WARN_C     28    // Warn if temperature above 28°C
#define TEMP_HOT_C      32    // Alert if above 32°C
#define LIGHT_DIM       500   // ADC below 500 = quite dark
#define LIGHT_BRIGHT   3000   // ADC above 3000 = very bright sunlight

// ── DHT11 reading ─────────────────────────────────────────────────────────────
// The DHT11 uses a special single-wire protocol.
// We send a start signal, then listen carefully for pulses.
// Each pulse length tells us a bit: short = 0, long = 1.
// We collect 40 bits = 5 bytes: humidity, humidity decimal, temp, temp decimal, checksum.

typedef struct {
    int  temperature_c;    // Temperature in Celsius (whole number)
    int  humidity_pct;     // Humidity in percent (whole number)
    bool valid;            // Was the reading successful?
} DHT11Result;

DHT11Result read_dht11(uint pin) {
    DHT11Result result = {0, 0, false};
    uint8_t data[5] = {0, 0, 0, 0, 0};

    // ── Step 1: Send start signal (pull LOW for 18 ms) ────────────────────────
    gpio_init(pin);
    gpio_set_dir(pin, GPIO_OUT);
    gpio_put(pin, 0);            // Pull the line LOW
    sleep_ms(18);                // Hold LOW for at least 18 ms
    gpio_put(pin, 1);            // Release HIGH
    sleep_us(30);                // Wait 30 microseconds

    // ── Step 2: Switch to input and wait for DHT11 response ───────────────────
    gpio_set_dir(pin, GPIO_IN);

    // DHT11 pulls LOW for 80 us, then HIGH for 80 us to say "I'm here!"
    uint32_t timeout = 0;
    while (!gpio_get(pin) && ++timeout < 10000);   // Wait for HIGH
    timeout = 0;
    while ( gpio_get(pin) && ++timeout < 10000);   // Wait for LOW — response done

    // ── Step 3: Read 40 bits of data ─────────────────────────────────────────
    for (int i = 0; i < 40; i++) {
        // Each bit starts with a LOW pulse (~50 us)
        timeout = 0;
        while (!gpio_get(pin) && ++timeout < 10000);  // Wait for HIGH (bit start)

        // Then a HIGH pulse: ~26 us = bit 0, ~70 us = bit 1
        sleep_us(40);   // Wait 40 us — if still HIGH, it's a 1, otherwise a 0

        if (gpio_get(pin)) {
            data[i / 8] |= (1 << (7 - (i % 8)));   // Set bit to 1
        }
        timeout = 0;
        while (gpio_get(pin) && ++timeout < 10000);   // Wait for next LOW
    }

    // ── Step 4: Check the checksum ────────────────────────────────────────────
    // The 5th byte must equal the sum of bytes 0-3 (keeping only the low 8 bits)
    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) {
        return result;   // Checksum failed — reading is unreliable, return invalid
    }

    result.humidity_pct    = data[0];    // Byte 0 = humidity
    result.temperature_c   = data[2];    // Byte 2 = temperature
    result.valid           = true;
    return result;
}

// ── Light sensor helper ────────────────────────────────────────────────────────
// Returns 0-4095 (0 = pitch dark, 4095 = very bright)
uint16_t read_light_level() {
    adc_select_input(0);   // Channel 0 = GP26
    return adc_read();
}

// ── Print a horizontal bar (like a progress bar) ──────────────────────────────
// Useful for seeing a number visually without a screen!
void print_bar(int value, int max_value, int bar_width) {
    int filled = value * bar_width / max_value;
    printf("[");
    for (int i = 0; i < bar_width; i++) {
        printf(i < filled ? "#" : "-");
    }
    printf("]");
}

int main() {
    stdio_init_all();
    sleep_ms(2000);   // Give serial terminal time to connect

    // ── ADC setup for light sensor ────────────────────────────────────────────
    adc_init();
    adc_gpio_init(LIGHT_ADC_PIN);

    // ── GPIO setup for other pins ─────────────────────────────────────────────
    gpio_init(SOUND_PIN);   gpio_set_dir(SOUND_PIN,  GPIO_IN);
    gpio_init(BUZZER_PIN);  gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_init(LED_GREEN);   gpio_set_dir(LED_GREEN,  GPIO_OUT);
    gpio_init(LED_YELLOW);  gpio_set_dir(LED_YELLOW, GPIO_OUT);
    gpio_init(LED_RED);     gpio_set_dir(LED_RED,    GPIO_OUT);

    // ── Start-up blink to show we are alive ───────────────────────────────────
    for (int i = 0; i < 3; i++) {
        gpio_put(LED_GREEN, 1); sleep_ms(150);
        gpio_put(LED_GREEN, 0); sleep_ms(150);
    }

    printf("\n");
    printf("╔══════════════════════════════════════════╗\n");
    printf("║   Mini Weather Station — Pico 2 W        ║\n");
    printf("╚══════════════════════════════════════════╝\n\n");

    while (true) {
        // ── Read all sensors ─────────────────────────────────────────────────
        DHT11Result dht = read_dht11(DHT11_PIN);
        uint16_t    light  = read_light_level();
        bool        loud   = gpio_get(SOUND_PIN);   // HIGH = loud noise detected

        // ── Print the dashboard ───────────────────────────────────────────────
        printf("─────────────────────────────────────────\n");

        if (dht.valid) {
            printf("🌡 Temperature : %d °C   ", dht.temperature_c);
            if      (dht.temperature_c >= TEMP_HOT_C)  printf("(HOT! 🔥)\n");
            else if (dht.temperature_c >= TEMP_WARN_C) printf("(Warm 🌤)\n");
            else                                         printf("(Comfortable 😊)\n");

            printf("💧 Humidity    : %d %%\n", dht.humidity_pct);
        } else {
            printf("🌡 Temperature : -- (sensor not ready yet, wait 2 seconds)\n");
        }

        printf("☀  Light Level : %4d  ", light);
        print_bar(light, 4095, 20);
        if      (light < LIGHT_DIM)    printf("  Dark 🌙\n");
        else if (light > LIGHT_BRIGHT) printf("  Bright ☀\n");
        else                            printf("  Normal 💡\n");

        printf("🔊 Sound Level : %s\n", loud ? "LOUD! 📣" : "Quiet 🤫");

        // ── Update LEDs and buzzer based on readings ───────────────────────────
        gpio_put(LED_GREEN,  false);
        gpio_put(LED_YELLOW, false);
        gpio_put(LED_RED,    false);
        gpio_put(BUZZER_PIN, false);

        if (dht.valid && dht.temperature_c >= TEMP_HOT_C) {
            // Too hot — red LED and a short warning beep!
            gpio_put(LED_RED,    true);
            gpio_put(BUZZER_PIN, true);
            sleep_ms(200);
            gpio_put(BUZZER_PIN, false);
        } else if (loud || (dht.valid && dht.temperature_c >= TEMP_WARN_C)) {
            // Getting warm OR loud — yellow warning LED
            gpio_put(LED_YELLOW, true);
        } else {
            // All good — green LED
            gpio_put(LED_GREEN, true);
        }

        printf("\n");
        sleep_ms(2000);   // Update every 2 seconds (DHT11 needs at least 1 second between readings)
    }

    return 0;
}
```

---

## 🔍 How the Code Works (Step by Step)

1. **`read_dht11()`** is the most complex function here. The DHT11 sensor uses a clever trick — it sends data using pulse lengths on a single wire. A short HIGH pulse means "0" and a long HIGH pulse means "1". We measure 40 pulses and collect 5 bytes of data.

2. **Checksum** — the DHT11 adds up its own 4 data bytes and puts the total in byte 5. Your Pico does the same addition and checks if they match. If not, the reading was corrupted (maybe noise on the wire) and we ignore it.

3. **`print_bar()`** draws a little text progress bar like `[####------]`. This is a fun way to see a number visually without a real screen. It maps the value (0-4095) onto a number of `#` characters (0-20).

4. **LED logic** — only one LED is on at a time. We turn them all off first, then turn on the right one based on sensor readings. This is a clean pattern called "clear then set."

5. **The buzzer** beeps once if the temperature is too high — useful if you put this station in a greenhouse or a fridge to alert you to temperature problems!

---

## 🧪 Try It!

1. **Watch the dashboard:** Open serial monitor at 115200 baud. The weather station prints a new reading every 2 seconds. Breathe on the DHT11 — your warm breath raises the temperature AND humidity!

2. **Test the light sensor:** Cover the photoresistor with your hand — see the reading drop to "Dark". Shine a torch on it — watch it go to "Bright"!

3. **Make noise:** Clap near the sound sensor and see "LOUD!" appear. Then sit quietly and watch it go back to "Quiet".

4. **Change the thresholds:** Set `TEMP_WARN_C` to your current room temperature. Now the yellow LED should be on. How warm does it need to get before the red LED triggers?

5. **🚀 Bonus challenge — Wi-Fi Web Dashboard:** The Pico 2 W has Wi-Fi built in! Look up the Pico W Wi-Fi example from Raspberry Pi's official documentation. Can you send your weather data to a simple web page so you can check it from your phone?

---

## 🏆 You Did It — All 37 Lessons Complete!

Look what you built over this whole course:

| Lesson | Skill Unlocked                                                                         |
| ------ | -------------------------------------------------------------------------------------- |
| 1      | Blink an LED — the "Hello World" of electronics                                        |
| 2–5    | Control LEDs, buzzers, and make sounds                                                 |
| 6–8    | Read light, sound, and tilt sensors                                                    |
| 9–10   | Measure temperature, humidity, and detect fire                                         |
| 11–14  | Use remotes, joysticks, encoders, and line sensors                                     |
| 15–16  | Control relays and detect magnets                                                      |
| 17–19  | Use laser tripwires, touch sensors, and heartbeat sensors                              |
| 20     | Build a complete multi-sensor security system                                          |
| 21–35  | 15 more advanced sensors — temperature probes, hall sensors, accelerometers, and more! |
| 36     | Read tilt and movement with a 3-axis accelerometer                                     |
| **37** | **Combine everything into a real weather station!**                                    |

You have gone from "What is a microcontroller?" all the way to building a device that reads the environment and reacts intelligently. That is real engineering. That is real programming. And you did it!

**What's next?**

- Try adding a small **OLED display** so your weather station does not need a computer
- Send your weather data to the internet using **Wi-Fi** and view it on your phone
- Add a **solar panel** so your station runs outdoors without a USB cable
- Build a second one and compare readings from different rooms in your house!

The world is full of problems that need sensors and code to solve. You now have the tools to start solving them. Keep building! 🚀

---

## 📝 What You Learned

- How to combine multiple sensors in one program
- How the DHT11 sends data using pulse lengths on a single wire
- How to use a checksum to verify sensor data is correct
- How to show information clearly in a serial terminal dashboard
- How all 37 sensors and 37 lessons built on each other
- You are now a real electronics engineer and programmer!
