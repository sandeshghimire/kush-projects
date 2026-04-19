# Power, Batteries & Sleep Modes

## What you'll learn
- How to power your robot from batteries instead of USB
- How voltage regulators work and which to choose
- How to monitor battery voltage with the ADC
- How to use the Pico's sleep modes to save power
- Safe practices for working with batteries

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 4× AA batteries + holder (~$3)
- 1× LM7805 voltage regulator or buck converter module (~$2)
- 2× 100µF capacitors (~$0.20)
- Resistors: 1× 10kΩ, 1× 20kΩ (~$0.10)
- Jumper wires (~$0.50)

## Background

When your robot is driving around the room, it can't be tethered to your computer by a USB cable! It needs **battery power**. But batteries are trickier than you might think — you need to understand voltages, current capacity, and how to keep everything safe.

Four AA batteries give you **6V** (1.5V each). A 2S LiPo battery gives about **7.4V**. But the Pico needs exactly **5V** on the VSYS pin (or 1.8–5.5V). Motors might need 6V or more. So you need a **voltage regulator** — a chip that takes a higher voltage and converts it to a stable lower voltage.

There are two types: **linear regulators** (like the LM7805) are simple but wasteful — they burn excess voltage as heat. **Buck converters** are more efficient — they use fast switching to convert voltage with minimal waste. For a robot, buck converters are the better choice because they waste less battery.

**Battery capacity** is measured in milliamp-hours (mAh). A 2000 mAh battery can supply 2000 mA for one hour, or 200 mA for ten hours. The Pico itself draws about 25 mA, but motors can draw 500 mA or more. Sleep modes can reduce the Pico's draw to under 1 mA!

You should monitor battery voltage using an ADC pin and a **voltage divider** to scale the battery voltage down to 0–3.3V (the ADC's range). This lets your robot know when it's time to recharge.

## Wiring

| Connection | Description |
|------------|-------------|
| Battery + | Input to voltage regulator VIN |
| Regulator VOUT | Pico VSYS pin (5V regulated) |
| Battery + through 20kΩ to GP28 | Voltage monitoring divider (top) |
| GP28 through 10kΩ to GND | Voltage monitoring divider (bottom) |
| Battery − | Common GND |

**Voltage divider math**: With 20kΩ and 10kΩ, the ADC reads 1/3 of battery voltage. At 6V, ADC sees 2V. At 7.4V, ADC sees 2.47V. Both within the 0–3.3V safe range.

## The code

```c
#include "pico/stdlib.h"
#include "pico/sleep.h"
#include "hardware/adc.h"
#include "hardware/clocks.h"
#include "hardware/gpio.h"
#include <stdio.h>

#define BATTERY_ADC_PIN   28   // GP28 = ADC2
#define BATTERY_ADC_INPUT 2
#define LED_PIN           25

// Voltage divider ratio: 10k / (20k + 10k) = 1/3
// So actual battery voltage = ADC voltage * 3
#define DIVIDER_RATIO 3.0f

// Battery thresholds (for 4xAA)
#define BATT_FULL    6.0f   // Full charge
#define BATT_LOW     4.8f   // Low warning (1.2V per cell)
#define BATT_CRITICAL 4.0f  // Must stop motors

float read_battery_voltage(void) {
    adc_select_input(BATTERY_ADC_INPUT);
    uint16_t raw = adc_read();
    float adc_voltage = raw * 3.3f / 4095.0f;
    return adc_voltage * DIVIDER_RATIO;
}

int battery_percentage(float voltage) {
    // Simple linear mapping
    if (voltage >= BATT_FULL) return 100;
    if (voltage <= BATT_CRITICAL) return 0;
    return (int)((voltage - BATT_CRITICAL) / (BATT_FULL - BATT_CRITICAL) * 100);
}

void enter_light_sleep(uint32_t seconds) {
    printf("Entering light sleep for %d seconds...\n");
    sleep_ms(100);  // Flush serial buffer

    // Set up a wake alarm
    datetime_t alarm = {
        .year  = -1, .month = -1, .day   = -1,
        .dotw  = -1, .hour  = -1, .min   = -1,
        .sec   = -1
    };

    // Use a simple timer-based sleep
    sleep_ms(seconds * 1000);

    printf("Woke up!\n");
}

int main() {
    stdio_init_all();

    // Initialize ADC for battery monitoring
    adc_init();
    adc_gpio_init(BATTERY_ADC_PIN);

    // LED for status indication
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    sleep_ms(2000);
    printf("Power management demo\n");

    while (true) {
        float batt_v = read_battery_voltage();
        int pct = battery_percentage(batt_v);

        printf("Battery: %.2fV (%d%%)\n", batt_v, pct);

        // Visual battery indicator
        if (batt_v >= BATT_FULL * 0.9f) {
            // Good battery — steady LED
            gpio_put(LED_PIN, 1);
        } else if (batt_v >= BATT_LOW) {
            // Medium — slow blink
            gpio_put(LED_PIN, 1);
            sleep_ms(500);
            gpio_put(LED_PIN, 0);
            sleep_ms(500);
            continue;
        } else if (batt_v >= BATT_CRITICAL) {
            // Low — fast blink
            for (int i = 0; i < 5; i++) {
                gpio_put(LED_PIN, 1);
                sleep_ms(100);
                gpio_put(LED_PIN, 0);
                sleep_ms(100);
            }
            printf("WARNING: Low battery!\n");
        } else {
            // Critical — shutdown motors, go to sleep
            printf("CRITICAL: Battery depleted. Sleeping...\n");
            gpio_put(LED_PIN, 0);
            enter_light_sleep(30);
        }

        sleep_ms(5000);  // Check every 5 seconds
    }

    return 0;
}
```

### How the code works

1. A **voltage divider** scales battery voltage to ADC range. We multiply the ADC reading by 3 (the divider ratio) to get the real voltage.
2. `battery_percentage()` maps voltage to a 0–100% range based on the battery chemistry's voltage curve.
3. The LED blink rate changes based on battery level: steady (good), slow blink (medium), fast blink (low), off (critical).
4. At critical levels, the code sleeps to save power and avoid damaging the batteries.

## Try it

1. **Voltage logging** — Print battery voltage every 10 seconds to chart how it drops during use.
2. **OLED status** — Display battery voltage and percentage on an OLED display from Lesson 8.
3. **Motor cutoff** — When battery drops below the low threshold, gradually reduce motor speed to prevent brownout.

## Challenge

Implement a "power budget" calculator: measure current draw in different modes (idle, driving, sensing) and estimate remaining runtime based on battery capacity. Display the estimate on the OLED.

## Summary

Battery power frees your robot from USB cables. Voltage regulators (preferably buck converters) step battery voltage down to 5V for the Pico. A voltage divider on an ADC pin lets you monitor battery level. Sleep modes reduce power consumption dramatically when the robot isn't active. Always monitor battery voltage and shut down gracefully when power gets low to protect your hardware and batteries!
