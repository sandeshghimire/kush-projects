# RGB LED Module — Mixing Colors Like a Painter

## 🎯 What you'll learn
- How PWM makes a pin act "in between" on and off — like a dimmer switch!
- What duty cycle means and how it controls brightness
- How to mix red, green, and blue light to make almost any color
- How to use the Pico's hardware PWM with the RGB LED Module
- How to create smooth color fades in code

## 🛒 Parts you'll need
- Raspberry Pi Pico 2 W (~$6)
- Elegoo 37 Sensor Kit — **RGB LED Module** (~$1, included in kit)
- Breadboard (~$5)
- 4× jumper wires (~$0.40)

## 🌟 Background

Have you ever mixed paint? Red and yellow make orange. Blue and yellow make green. Light works the same way, except the three ingredients are **Red**, **Green**, and **Blue** — that is why it is called **RGB**! Your phone's screen, your TV, and computer monitors all use tiny RGB dots packed together to show millions of colors.

The Elegoo RGB LED Module has three tiny LEDs squeezed into one package — a red one, a green one, and a blue one. By changing how bright each one is, you can mix them into almost any color. Full red + full green = yellow. Full green + full blue = cyan (a bright blue-green). All three at full power = white! And because the module has **built-in resistors** to protect each LED, you do not need to add any extra parts. Just plug it straight in!

But wait — GPIO pins can only be fully ON or fully OFF. So how do we make an LED glow at half-brightness? The trick is called **PWM** (which stands for Pulse Width Modulation, but you can just think of it as a super-fast dimmer switch!). Instead of leaving the pin on, the Pico flicks it on and off *incredibly* fast — so fast your eyes cannot see the flickering. If it is on half the time and off half the time, the LED looks half as bright. If it is on only 10% of the time, it looks very dim. The Pico 2 W has special **hardware PWM** circuits that do all that fast flickering automatically. You just say "be 50% bright" and the hardware handles everything — like magic!

The RGB LED Module uses a **common cathode** design — all three LEDs share one GND wire. Think of it like three garden hoses going into the same drain. Each hose has its own tap (the R, G, B pins), but they all drain to the same place.

## 🔌 Wiring

| Pico Pin | RGB LED Module Pin |
|----------|--------------------|
| GP15 | R (Red) |
| GP16 | G (Green) |
| GP17 | B (Blue) |
| GND | GND |

Plug the module into your breadboard. Connect four jumper wires as listed above. The module's pins are labeled R, G, B, and GND (or sometimes –). Double-check that GND goes to GND — if your colors look wrong, that is usually the problem!

## 💻 The code

```c
#include "pico/stdlib.h"
#include "hardware/pwm.h"

// -----------------------------------------------
// Lesson 2: RGB LED Module — Mix colors with PWM!
// -----------------------------------------------

#define RED_PIN   15
#define GREEN_PIN 16
#define BLUE_PIN  17

// How many steps in our counter (0 to 255, like a color mixer)
#define MAX_BRIGHTNESS 255

// Set up one pin for PWM output
void pwm_setup(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);      // Switch pin to PWM mode
    uint slice = pwm_gpio_to_slice_num(pin);    // Find which PWM slice this pin uses
    pwm_set_wrap(slice, MAX_BRIGHTNESS);         // Count from 0 to 255
    pwm_set_enabled(slice, true);               // Start the PWM hardware running
}

// Set the brightness of one color (0 = off, 255 = full blast!)
void set_color_channel(uint pin, uint8_t brightness) {
    uint slice   = pwm_gpio_to_slice_num(pin);
    uint channel = pwm_gpio_to_channel(pin);
    pwm_set_chan_level(slice, channel, brightness);
}

// Set all three colors at once — like dipping a paintbrush!
void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    set_color_channel(RED_PIN,   r);
    set_color_channel(GREEN_PIN, g);
    set_color_channel(BLUE_PIN,  b);
}

int main() {
    // Set up all three LED pins for PWM
    pwm_setup(RED_PIN);
    pwm_setup(GREEN_PIN);
    pwm_setup(BLUE_PIN);

    // Start with everything off
    set_rgb(0, 0, 0);

    while (true) {

        // =============================================
        // PART 1: Show some named colors — like a rainbow!
        // =============================================

        set_rgb(255,   0,   0);   // Pure RED
        sleep_ms(800);

        set_rgb(255, 165,   0);   // ORANGE  (red + a bit of green)
        sleep_ms(800);

        set_rgb(255, 255,   0);   // YELLOW  (red + green, no blue)
        sleep_ms(800);

        set_rgb(  0, 255,   0);   // Pure GREEN
        sleep_ms(800);

        set_rgb(  0, 255, 255);   // CYAN    (green + blue, no red)
        sleep_ms(800);

        set_rgb(  0,   0, 255);   // Pure BLUE
        sleep_ms(800);

        set_rgb(128,   0, 255);   // PURPLE  (red + blue)
        sleep_ms(800);

        set_rgb(255, 255, 255);   // WHITE   (all three — full power!)
        sleep_ms(800);

        set_rgb(  0,   0,   0);   // OFF     (take a breath)
        sleep_ms(400);

        // =============================================
        // PART 2: Smooth color fades — like a sunset!
        // =============================================

        // Fade from RED to GREEN
        for (int i = 0; i <= 255; i++) {
            set_rgb(255 - i, i, 0);   // Red goes down, green comes up
            sleep_ms(8);
        }

        // Fade from GREEN to BLUE
        for (int i = 0; i <= 255; i++) {
            set_rgb(0, 255 - i, i);   // Green goes down, blue comes up
            sleep_ms(8);
        }

        // Fade from BLUE back to RED
        for (int i = 0; i <= 255; i++) {
            set_rgb(i, 0, 255 - i);   // Blue goes down, red comes up
            sleep_ms(8);
        }

        // =============================================
        // PART 3: Twinkle! Ramp all colors up then down
        // =============================================

        // Fade to white (all channels rising together)
        for (int i = 0; i <= 255; i++) {
            set_rgb(i, i, i);         // Slowly becoming white...
            sleep_ms(5);
        }

        // Fade back to black (all channels falling together)
        for (int i = 255; i >= 0; i--) {
            set_rgb(i, i, i);         // Slowly fading out...
            sleep_ms(5);
        }
    }

    return 0;
}
```

## 🔍 How the code works

1. **`gpio_set_function(pin, GPIO_FUNC_PWM)`** — This switches the pin from normal on/off mode into PWM mode. Think of it like changing the setting on a light switch from "regular switch" to "dimmer."
2. **`pwm_gpio_to_slice_num(pin)`** — The Pico groups its PWM hardware into "slices." This finds which slice controls our pin so we can set it up.
3. **`pwm_set_wrap(slice, 255)`** — The PWM counter counts from 0 up to this number (255) and then resets. This gives us 256 brightness levels — exactly like the 0–255 color values you see in art programs!
4. **`pwm_set_chan_level(slice, channel, brightness)`** — Set it to 128 and the pin is on 50% of the time (half brightness). Set it to 255 and it is always on (full brightness). Set it to 0 and it is always off.
5. **`pwm_set_enabled(slice, true)`** — Starts the PWM hardware running. Once enabled, it runs automatically in the background — your code just needs to update the brightness levels.
6. **The fade loops** — By slowly changing R, G, and B values inside a `for` loop, we smoothly blend between colors. `sleep_ms(8)` between each step makes the transition take about 2 seconds (256 steps × 8ms).

## 🚀 Try it

1. **Your favorite color** — Look up the RGB values for your favorite color online (search "hex color picker") and add it to the named-colors section. Purple is `(128, 0, 128)`, lime green is `(50, 205, 50)`, coral is `(255, 127, 80)`.
2. **Slow-motion sunset** — Change the `sleep_ms(8)` in the fade loops to `sleep_ms(20)` for a dramatic slow sunset, or `sleep_ms(2)` for a super-fast rainbow flash.
3. **Police lights** — Flash red and blue alternately with `sleep_ms(150)` between them. Add a pause every 6 flashes.
4. **Traffic light** — Use `set_rgb()` to make a traffic light that goes green → yellow → red → green. Use `sleep_ms(4000)` for green and red, `sleep_ms(1500)` for yellow.

## 🏆 Challenge

Write a `breathe_color(r, g, b, cycles)` function that makes the LED gently pulse a chosen color the given number of times — brightening up and then fading back to black, like a sleeping phone indicator. Then call it three times: once for red, once for blue, and once for green. As a bonus, try making it breathe purple (`r=128, g=0, b=128`)!

## ✅ Summary

You learned that PWM tricks a digital pin into acting like it has many brightness levels by flickering on and off incredibly fast — like a TV screen that looks bright and colorful even though each pixel is only ever on or off. By controlling three PWM channels for red, green, and blue, you can mix millions of colors from the RGB LED Module — just like a digital painter. The Pico's hardware PWM handles all the fast switching automatically, so your code just sets brightness values and the hardware does the rest.
