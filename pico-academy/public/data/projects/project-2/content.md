# Mount the Brain: Pico on the Chassis

## What you'll learn
- How to assemble a 2WD robot chassis from a kit
- Why standoffs and mounting matter for vibration and shorts
- How to securely mount the Pico 2 on a perfboard carrier
- How to read the Pico 2 unique board ID in code
- How to blink the on-board LED as a "heartbeat" indicator

## Parts you'll need
- 2WD robot chassis kit (acrylic plates, 2 DC motors, 2 wheels, 1 caster) — $15
- M3 × 10 mm standoffs, nuts and screws (pack of 8) — $3
- Perfboard (5 × 7 cm) — $2
- Header pins (2 × 20-pin strips) — from your kit

**Total: ≈ $20**

## Background

A robot car is really just a rolling computer! The chassis kit gives you two flat acrylic plates, two yellow DC gear-motors, wheels, and a small ball caster for the front. Think of the bottom plate as the "floor" of your robot and the top plate as the "roof." Motors bolt underneath; electronics ride on top.

We mount the Pico 2 on a small perfboard first instead of gluing it straight to the chassis. The perfboard acts like a mini motherboard — you can solder header pins so the Pico plugs in and out easily. If you ever need to swap boards, no desoldering required! The standoffs lift the perfboard off the acrylic so nothing on the bottom of the board touches the chassis and causes a short circuit.

When the Pico is mounted and powered on (using the power module from Project 1), the first thing we want to see is a **heartbeat blink** — the on-board LED flashing once per second. That tells you instantly that the brain is alive and running code.

We will also print the Pico 2's unique 64-bit board ID over USB serial. Every chip has a different ID burned in at the factory. Later, you could use this to give your robot a name!

## Wiring

This project is mostly mechanical assembly, so wiring is minimal:

| From | To | Notes |
|---|---|---|
| Power Module VSYS out | Pico VSYS (pin 39) | From Project 1 |
| Power Module GND | Pico GND (pin 38) | From Project 1 |

**Mechanical steps:**
1. Bolt the two DC motors into the slots on the bottom acrylic plate using the screws from the kit.
2. Press-fit the wheels onto the motor shafts.
3. Attach the ball caster to the front hole with its screws.
4. Solder 2 × 20-pin header strips onto the perfboard, spaced to match the Pico 2 pin rows.
5. Screw 4 × M3 standoffs into the top acrylic plate.
6. Mount the perfboard on the standoffs with M3 nuts on top.
7. Plug the Pico 2 into the header pins.

## The code

```c
#include <stdio.h>
#include "pico/stdlib.h"
#include "pico/unique_id.h"
#include "hardware/clocks.h"

#define ONBOARD_LED_PIN 25

void print_board_info(void) {
    // Read the unique 64-bit board ID
    pico_unique_board_id_t board_id;
    pico_get_unique_board_id(&board_id);

    printf("=== Pico 2 Brain — System Info ===\n");
    printf("Board unique ID: ");
    for (int i = 0; i < PICO_UNIQUE_BOARD_ID_SIZE_BYTES; i++) {
        printf("%02X", board_id.id[i]);
    }
    printf("\n");

    // Print system clock speed
    uint32_t sys_clk = clock_get_hz(clk_sys);
    printf("System clock   : %lu MHz\n", sys_clk / 1000000);
    printf("Flash target   : %s\n", PICO_BOARD);
    printf("SDK version    : %s\n", PICO_SDK_VERSION_STRING);
    printf("=================================\n\n");
}

int main(void) {
    stdio_init_all();
    sleep_ms(2000);  // Wait for USB serial to connect

    // Set up the on-board LED
    gpio_init(ONBOARD_LED_PIN);
    gpio_set_dir(ONBOARD_LED_PIN, GPIO_OUT);

    print_board_info();
    printf("Heartbeat running — LED should blink once per second.\n");

    uint32_t count = 0;
    while (true) {
        gpio_put(ONBOARD_LED_PIN, 1);
        sleep_ms(500);
        gpio_put(ONBOARD_LED_PIN, 0);
        sleep_ms(500);

        count++;
        if (count % 10 == 0) {
            printf("Heartbeat count: %lu (uptime ≈ %lu s)\n", count, count);
        }
    }

    return 0;
}
```

## Try it
1. **Change the blink speed** — Edit the `sleep_ms()` values to make the LED blink faster (200 ms) or slower (2000 ms).
2. **Double flash** — Make the LED flash twice quickly, then pause for a second — like a real heartbeat pulse!
3. **Name your robot** — Use the last 4 hex digits of the board ID as a nickname. Print "Hello, I am Robot-AB3F!" on startup.

## Challenge

Add a small piezo buzzer on GP15. Make the robot play a short start-up melody (three quick beeps at different frequencies) when it powers on, so you know the brain is alive even without looking at the LED.

## Summary

You assembled the physical robot chassis, mounted the Pico 2 on standoffs, and ran a heartbeat program that blinks the LED and prints system information. The brain is alive and ready to control motors and read sensors!

## How this fits the robot

The chassis is the robot's skeleton and the Pico 2 is its brain. Every future project — motors, encoders, ultrasonic eyes — plugs into this central brain board. A solid, vibration-free mount means reliable electrical connections when the car is zooming around the floor.
