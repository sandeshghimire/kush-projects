# Build the Power Module

## What you'll learn
- How batteries provide voltage and current to a circuit
- What a buck converter does and why robots need stable 5 V
- How to use a rocker switch for safe on/off control
- How to read battery voltage with the Pico 2 ADC
- Why monitoring battery level prevents robot brownouts

## Parts you'll need
- 7.4 V Li-ion battery pack (2S) — $6
- Rocker switch (SPST) — $1
- MP1584 adjustable buck converter module — $2
- 1× green LED — $0.15
- 1× 330 Ω resistor — $0.20
- Hookup wire and solder — from your kit

**Total: ≈ $9.35**

## Background

Every robot needs power, just like you need breakfast before school! The battery pack stores energy and feeds it to every part of the car. Our 7.4 V pack is made of two lithium cells in series — that is too much voltage for the Pico 2, which wants around 5 V on its VSYS pin. If we plugged the battery straight in, the board could be damaged.

That is where the **buck converter** comes in. "Buck" means it steps voltage *down*. The tiny MP1584 chip switches on and off thousands of times per second and, with help from an inductor and capacitor, smooths the output to a steady 5 V. You will turn the small potentiometer on the module with a screwdriver until your multimeter reads 5.0 V.

The rocker switch sits between the battery and the buck converter so you can turn the robot on and off without unplugging wires. The green LED lights up when power is on — a simple but important indicator so you never accidentally leave the robot draining the battery.

Finally, we will write a short program that reads the battery voltage through the Pico's ADC. The Pico 2 has a special internal channel that measures VSYS through a voltage divider (VSYS/3). Knowing the battery level lets the robot warn you before it runs out of juice.

## Wiring

| From | To | Notes |
|---|---|---|
| Battery + (red) | Rocker switch terminal 1 | Solder or screw terminal |
| Rocker switch terminal 2 | MP1584 VIN+ | Input side of buck module |
| Battery − (black) | MP1584 GND | Common ground |
| MP1584 VOUT+ | Pico 2 VSYS (pin 39) | Adjusted to 5.0 V first! |
| MP1584 GND | Pico 2 GND (pin 38) | Common ground |
| MP1584 VOUT+ | 330 Ω resistor leg 1 | Power indicator LED |
| 330 Ω resistor leg 2 | LED anode (+) | Longer leg of LED |
| LED cathode (−) | GND rail | Shorter leg of LED |

> **Safety note:** Always adjust the buck converter output to 5.0 V with a multimeter *before* connecting the Pico!

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"

// The Pico 2 has an internal VSYS/3 measurement on ADC channel 3
// (GPIO 29 is connected through a 200k/100k divider on the board).
#define VSYS_ADC_CHANNEL 3
#define ADC_VREF         3.3f
#define ADC_RESOLUTION   4095.0f   // 12-bit ADC
#define VSYS_DIVIDER     3.0f      // board divider ratio

float read_vsys_voltage(void) {
    adc_select_input(VSYS_ADC_CHANNEL);
    uint16_t raw = adc_read();
    float voltage = (raw / ADC_RESOLUTION) * ADC_VREF * VSYS_DIVIDER;
    return voltage;
}

int main(void) {
    stdio_init_all();
    adc_init();

    // GPIO 29 is used internally for VSYS sense — make sure it is in ADC mode
    adc_gpio_init(29);

    printf("=== Power Module Battery Monitor ===\n");

    while (true) {
        float vsys = read_vsys_voltage();
        printf("VSYS voltage: %.2f V", vsys);

        if (vsys < 6.0f) {
            printf("  ⚠ LOW BATTERY — charge soon!");
        } else {
            printf("  ✓ Battery OK");
        }
        printf("\n");

        sleep_ms(2000);
    }

    return 0;
}
```

## Try it
1. **Multimeter check** — Measure the buck converter output with a multimeter before connecting the Pico. Adjust the pot until it reads 5.0 V.
2. **LED brightness** — Swap the 330 Ω resistor for 1 kΩ. Notice the LED gets dimmer because less current flows.
3. **Serial monitor** — Open a serial terminal at 115200 baud and watch the voltage readings update every 2 seconds.

## Challenge

Add a second LED (red) on a spare GPIO pin. Make the Pico turn it on when the battery drops below 6.5 V, giving a visual low-battery warning right on the robot.

## Summary

You built the robot's power system! The battery feeds through a switch into a buck converter that outputs a safe, steady 5 V for the Pico 2. You also wrote code to monitor the battery voltage using the ADC — your robot now knows how much energy it has left.

## How this fits the robot

The power module is the foundation of the entire car. Every other project — motors, sensors, the brain itself — draws its energy from this module. A clean, switched 5 V supply means the Pico runs reliably, and battery monitoring means your robot can warn you (or even drive back to base) before the lights go out.
