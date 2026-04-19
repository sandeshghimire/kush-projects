# I2C — Talking to an OLED Display

## What you'll learn
- What the I2C protocol is and how it works
- How to wire and communicate with an SSD1306 OLED display
- How to send commands and pixel data over I2C
- How to draw text and simple shapes on the screen
- How to scan for I2C devices and understand addresses

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× SSD1306 0.96" OLED display (128×64, I2C) (~$5)
- 4× jumper wires (~$0.40)

## Background

Imagine a bus route in a city. One bus (the **master**) drives along a road, and many houses (the **slaves**) sit along that road. Each house has a unique address number. The bus stops at a specific address, delivers a package, and moves on. That's I2C!

**I2C** (pronounced "eye-squared-see") uses just two wires to communicate with many devices: **SDA** (Serial Data) carries the actual data, and **SCL** (Serial Clock) keeps everyone synchronized. The Pico is the master — it controls the clock and initiates all communication. Each connected device has a unique 7-bit **address** (a number like 0x3C).

Our SSD1306 OLED display has address **0x3C**. It's a tiny screen with 128×64 pixels — each pixel can be on (white) or off (black). To draw on it, we send commands (like "set the cursor position") and data (the actual pixel bytes) over I2C. The display has a built-in controller that turns our bytes into visible pixels.

The Pico 2 has two I2C peripherals: I2C0 and I2C1. We'll use **I2C0** on **GP4 (SDA)** and **GP5 (SCL)**. I2C typically runs at 100 kHz (standard mode) or 400 kHz (fast mode). The SSD1306 supports 400 kHz, so we'll use that for snappy screen updates.

## Wiring

| Pico Pin | OLED Pin |
|----------|----------|
| GP4 (I2C0 SDA) | SDA |
| GP5 (I2C0 SCL) | SCL |
| 3V3 | VCC |
| GND | GND |

That's it — just four wires! I2C needs pull-up resistors on SDA and SCL, but most OLED modules have them built in.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include <stdio.h>
#include <string.h>

#define I2C_PORT    i2c0
#define I2C_SDA     4
#define I2C_SCL     5
#define OLED_ADDR   0x3C
#define OLED_WIDTH  128
#define OLED_HEIGHT 64

// Display buffer: 128 x 64 pixels = 1024 bytes
uint8_t display_buf[OLED_WIDTH * OLED_HEIGHT / 8];

// Send a single command byte to the OLED
void oled_cmd(uint8_t cmd) {
    uint8_t data[2] = {0x00, cmd};  // 0x00 = command mode
    i2c_write_blocking(I2C_PORT, OLED_ADDR, data, 2, false);
}

// Initialize the SSD1306 OLED display
void oled_init(void) {
    oled_cmd(0xAE);  // Display off
    oled_cmd(0xD5);  // Set display clock
    oled_cmd(0x80);
    oled_cmd(0xA8);  // Set multiplex ratio
    oled_cmd(0x3F);  // 64 rows
    oled_cmd(0xD3);  // Set display offset
    oled_cmd(0x00);
    oled_cmd(0x40);  // Set start line to 0
    oled_cmd(0x8D);  // Charge pump
    oled_cmd(0x14);  // Enable charge pump
    oled_cmd(0x20);  // Memory addressing mode
    oled_cmd(0x00);  // Horizontal addressing
    oled_cmd(0xA1);  // Segment remap
    oled_cmd(0xC8);  // COM output scan direction
    oled_cmd(0xDA);  // COM pins configuration
    oled_cmd(0x12);
    oled_cmd(0x81);  // Set contrast
    oled_cmd(0xCF);
    oled_cmd(0xD9);  // Pre-charge period
    oled_cmd(0xF1);
    oled_cmd(0xDB);  // VCOMH deselect level
    oled_cmd(0x40);
    oled_cmd(0xA4);  // Display from RAM
    oled_cmd(0xA6);  // Normal display (not inverted)
    oled_cmd(0xAF);  // Display on
}

// Push the entire buffer to the display
void oled_update(void) {
    oled_cmd(0x21);  // Column address range
    oled_cmd(0);
    oled_cmd(127);
    oled_cmd(0x22);  // Page address range
    oled_cmd(0);
    oled_cmd(7);

    uint8_t buf[OLED_WIDTH + 1];
    for (int page = 0; page < 8; page++) {
        buf[0] = 0x40;  // Data mode
        memcpy(&buf[1], &display_buf[page * OLED_WIDTH], OLED_WIDTH);
        i2c_write_blocking(I2C_PORT, OLED_ADDR, buf, OLED_WIDTH + 1, false);
    }
}

// Set a single pixel in the buffer
void oled_pixel(int x, int y, bool on) {
    if (x < 0 || x >= OLED_WIDTH || y < 0 || y >= OLED_HEIGHT) return;
    int index = x + (y / 8) * OLED_WIDTH;
    if (on)
        display_buf[index] |= (1 << (y % 8));
    else
        display_buf[index] &= ~(1 << (y % 8));
}

// Clear the display buffer
void oled_clear(void) {
    memset(display_buf, 0, sizeof(display_buf));
}

int main() {
    stdio_init_all();

    // Initialize I2C at 400 kHz
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(I2C_SDA, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(I2C_SDA);
    gpio_pull_up(I2C_SCL);

    oled_init();
    oled_clear();

    // Draw a border rectangle
    for (int x = 0; x < OLED_WIDTH; x++) {
        oled_pixel(x, 0, true);
        oled_pixel(x, OLED_HEIGHT - 1, true);
    }
    for (int y = 0; y < OLED_HEIGHT; y++) {
        oled_pixel(0, y, true);
        oled_pixel(OLED_WIDTH - 1, y, true);
    }

    // Draw a diagonal line
    for (int i = 0; i < OLED_HEIGHT; i++) {
        oled_pixel(i * 2, i, true);
    }

    oled_update();

    printf("OLED display initialized!\n");

    int frame = 0;
    while (true) {
        // Animate a moving pixel
        oled_clear();
        int x = frame % OLED_WIDTH;
        int y = 32;
        for (int dx = -2; dx <= 2; dx++) {
            for (int dy = -2; dy <= 2; dy++) {
                oled_pixel(x + dx, y + dy, true);
            }
        }
        oled_update();
        frame++;
        sleep_ms(20);
    }

    return 0;
}
```

### How the code works

1. `i2c_init(i2c0, 400000)` starts I2C0 at 400 kHz.
2. `i2c_write_blocking()` sends bytes to the device at address 0x3C and waits for it to respond.
3. We maintain a **framebuffer** — a chunk of memory representing every pixel. We draw to this buffer, then push the whole thing to the display with `oled_update()`.
4. The SSD1306 uses "pages" — each page is 8 pixels tall and 128 pixels wide, stored as one byte per column.

## Try it

1. **I2C scanner** — Write a loop from address 0x00 to 0x7F, trying to write to each. Print which addresses respond.
2. **Text rendering** — Create a simple 5×7 font array and draw characters on the OLED.
3. **Sensor display** — Combine with Lesson 5 to show ADC readings on the OLED in real time.

## Challenge

Create an animated bouncing ball on the OLED: a small circle that moves around the screen and bounces off the edges. Add gravity so it arcs naturally and gradually slows down.

## Summary

I2C lets you communicate with many devices using just two wires (SDA and SCL). The SSD1306 OLED at address 0x3C gives you a 128×64 pixel screen for displaying text, shapes, and sensor data. You learned to send commands and pixel data over I2C, use a framebuffer pattern, and draw graphics pixel by pixel. Your robot will use this display to show its status!
