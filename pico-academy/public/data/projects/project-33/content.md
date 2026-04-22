# Project 33: Tiny Rainbow — A Mini Light Show in Your Hand!

## 🎯 What You'll Learn
- How an SMD RGB LED mixes red, green, and blue to make ANY colour
- How to cycle through rainbow colours using maths
- How to use a button to change colour-cycling speed
- How a rotary encoder controls brightness

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| SMD RGB LED Module | $1.50 |
| Rotary Encoder Module | $2.00 |
| Push Button | $0.50 |
| 10kΩ Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$14.10** |

## 🌟 The Story

Mix red and green paint and you get yellow. Mix red and blue and you get purple. Mix all three and you get white (or brown if you are using paint — but with light it is different!). TVs and phone screens use millions of tiny red, green, and blue dots. By making each one brighter or dimmer, they can create ANY colour you can imagine!

Your SMD RGB LED has three tiny LEDs packed into one little module. By controlling how bright each colour is with PWM, you can make incredible combinations. Use the button to speed up or slow down the rainbow cycle. Twist the rotary encoder knob to make everything brighter or dimmer. It is like having a tiny, programmable LED lamp!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| RGB LED Module GND | Pico GND | Ground (common cathode) |
| RGB LED Module R pin | Pico GP0 | Red channel (PWM) |
| RGB LED Module G pin | Pico GP1 | Green channel (PWM) |
| RGB LED Module B pin | Pico GP2 | Blue channel (PWM) |
| Rotary Encoder CLK | Pico GP10 | Clock signal |
| Rotary Encoder DT | Pico GP11 | Data signal |
| Rotary Encoder SW (button) | Pico GP12 | Press button |
| Rotary Encoder VCC | Pico 3.3V | Power |
| Rotary Encoder GND | Pico GND | Ground |
| Speed Button one leg | Pico GP15 | Cycle speed button |
| Speed Button other leg | Pico GND | Ground |
| 10kΩ resistor | GP15 to 3.3V | Pull-up |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/pwm.h"   // For controlling LED brightness
#include <stdio.h>          // For printf
#include <math.h>           // For sin() — to make smooth colour waves

// Pin definitions for RGB LED
#define RED_PIN    0        // Red channel
#define GREEN_PIN  1        // Green channel
#define BLUE_PIN   2        // Blue channel

// Rotary encoder pins
#define ENC_CLK    10       // Encoder clock
#define ENC_DT     11       // Encoder data
#define ENC_SW     12       // Encoder push button

// Speed control button
#define SPEED_BTN  15       // Button to change speed

// PWM setup — 8-bit resolution (0-255)
#define PWM_WRAP   255

// Rainbow speed levels (delay between colour steps in ms)
int speed_levels[] = {20, 10, 5, 2, 1};     // 5 speed levels
int num_speeds = 5;                           // How many speeds
int current_speed_idx = 0;                    // Start at slowest

// Brightness (controlled by rotary encoder)
int brightness = 200;       // 0-255 range
int enc_last_clk = 1;       // Last encoder CLK state

// Set up PWM on a pin
void setup_pwm_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);          // Set to PWM mode
    uint slice = pwm_gpio_to_slice_num(pin);         // Get slice
    pwm_set_wrap(slice, PWM_WRAP);                   // 256 steps
    pwm_set_enabled(slice, true);                    // Enable
}

// Set colour on RGB LED (values 0-255 each)
// Scales each channel by the global brightness setting
void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    // Scale by brightness
    uint8_t r_scaled = (uint8_t)((uint32_t)r * brightness / 255);
    uint8_t g_scaled = (uint8_t)((uint32_t)g * brightness / 255);
    uint8_t b_scaled = (uint8_t)((uint32_t)b * brightness / 255);

    // Set each channel's PWM level
    uint slice_r = pwm_gpio_to_slice_num(RED_PIN);
    uint slice_g = pwm_gpio_to_slice_num(GREEN_PIN);
    uint slice_b = pwm_gpio_to_slice_num(BLUE_PIN);

    pwm_set_chan_level(slice_r, pwm_gpio_to_channel(RED_PIN),   r_scaled);
    pwm_set_chan_level(slice_g, pwm_gpio_to_channel(GREEN_PIN), g_scaled);
    pwm_set_chan_level(slice_b, pwm_gpio_to_channel(BLUE_PIN),  b_scaled);
}

// Convert a hue (0-360 degrees) to RGB values
// This creates smooth rainbow colour transitions
void hue_to_rgb(int hue, uint8_t *r, uint8_t *g, uint8_t *b) {
    hue = hue % 360;                        // Keep in 0-359 range
    int sector = hue / 60;                  // Which colour sector (0-5)
    int remainder = hue % 60;               // Position within sector
    int p = 0;                              // Minimum value
    int q = 255 * (60 - remainder) / 60;   // Falling ramp
    int t = 255 * remainder / 60;          // Rising ramp

    switch (sector) {                       // Calculate RGB for each sector
        case 0: *r = 255; *g = t;   *b = 0;   break;  // Red -> Yellow
        case 1: *r = q;   *g = 255; *b = 0;   break;  // Yellow -> Green
        case 2: *r = 0;   *g = 255; *b = t;   break;  // Green -> Cyan
        case 3: *r = 0;   *g = q;   *b = 255; break;  // Cyan -> Blue
        case 4: *r = t;   *g = 0;   *b = 255; break;  // Blue -> Magenta
        case 5: *r = 255; *g = 0;   *b = q;   break;  // Magenta -> Red
        default: *r = 0; *g = 0; *b = 0; break;
    }
    (void)p;                                // Suppress unused warning
}

// Check rotary encoder and update brightness
void check_encoder() {
    int clk = gpio_get(ENC_CLK);            // Read CLK pin

    if (clk != enc_last_clk) {             // CLK changed?
        if (gpio_get(ENC_DT) != clk) {     // DT state vs CLK = direction
            brightness += 10;               // Clockwise = brighter
            if (brightness > 255) brightness = 255;
        } else {
            brightness -= 10;               // Counter-clockwise = dimmer
            if (brightness < 10) brightness = 10;
        }
        printf("Brightness: %d\n", brightness);
    }
    enc_last_clk = clk;                     // Remember last state
}

// Check speed button
bool check_speed_button() {
    if (gpio_get(SPEED_BTN) == 0) {        // Button pressed?
        sleep_ms(50);                       // Debounce
        if (gpio_get(SPEED_BTN) == 0) {
            while (gpio_get(SPEED_BTN) == 0) sleep_ms(10);  // Wait release
            return true;
        }
    }
    return false;
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up PWM for RGB LED
    setup_pwm_pin(RED_PIN);
    setup_pwm_pin(GREEN_PIN);
    setup_pwm_pin(BLUE_PIN);

    // Set up rotary encoder pins
    gpio_init(ENC_CLK); gpio_set_dir(ENC_CLK, GPIO_IN); gpio_pull_up(ENC_CLK);
    gpio_init(ENC_DT);  gpio_set_dir(ENC_DT,  GPIO_IN); gpio_pull_up(ENC_DT);
    gpio_init(ENC_SW);  gpio_set_dir(ENC_SW,  GPIO_IN); gpio_pull_up(ENC_SW);

    // Set up speed button
    gpio_init(SPEED_BTN);
    gpio_set_dir(SPEED_BTN, GPIO_IN);
    gpio_pull_up(SPEED_BTN);

    enc_last_clk = gpio_get(ENC_CLK);      // Read initial encoder state

    printf("=== TINY RAINBOW ===\n");
    printf("Speed button: change colour cycle speed\n");
    printf("Rotate encoder: change brightness\n\n");

    int hue = 0;                            // Start at red (hue 0)

    while (true) {                          // Loop forever

        // Check for speed button press
        if (check_speed_button()) {
            current_speed_idx = (current_speed_idx + 1) % num_speeds;
            printf("Speed: %d (delay %dms)\n",
                   current_speed_idx + 1,
                   speed_levels[current_speed_idx]);
        }

        // Check rotary encoder for brightness
        check_encoder();

        // Calculate RGB for current hue
        uint8_t r, g, b;
        hue_to_rgb(hue, &r, &g, &b);       // Convert hue to RGB
        set_rgb(r, g, b);                   // Set the LED colour

        // Advance hue for next step
        hue = (hue + 1) % 360;             // Cycle 0-359

        // Print current colour occasionally
        if (hue % 60 == 0) {               // Print every 60 degrees
            printf("Hue: %3d | R:%3d G:%3d B:%3d | Brightness: %d\n",
                   hue, r, g, b, brightness);
        }

        sleep_ms(speed_levels[current_speed_idx]);  // Speed delay
    }

    return 0;
}
```

## 🔍 How It Works

1. The RGB LED has three separate LEDs (red, green, blue) inside one tiny package
2. PWM controls each colour's brightness from 0 to 255
3. The hue-to-RGB function converts a single "colour wheel" position into RGB values
4. Stepping through hue 0 to 359 smoothly cycles through the entire rainbow
5. The rotary encoder adjusts the overall brightness by scaling all three channels

## 🎮 Try It!

- Watch the full rainbow cycle once — can you name all the colours you see?
- Press the speed button multiple times — which speed do you like best?
- Twist the encoder left and right — watch the brightness change smoothly
- Cover the LED with a piece of tissue paper for a diffused glow effect!

## 🏆 Challenge

Add a mode where the RGB LED reacts to sound! Connect a microphone and use the sound level to change the hue speed. Quiet room = slow cycle. Loud music = fast rainbow. Now you have a music-reactive light show!

## 📝 What You Built

You built a mini programmable rainbow light using an RGB LED with PWM colour mixing, a rotary encoder for brightness, and a button for speed control! You learned how all colours of light are made from just red, green, and blue — the same way every TV and phone screen works.
