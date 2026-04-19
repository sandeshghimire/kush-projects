# OLED Status Display

## What you'll learn
- How to drive an SSD1306 OLED display over I2C
- How to use a framebuffer to draw pixels, text, and shapes
- How to display real-time robot status information
- How multiple I2C devices coexist on the same bus
- How to organize a display layout for quick reading

## Parts you'll need
- SSD1306 0.96" OLED display 128×64 (~$4) — same as used in Lesson 8

## Background

Imagine trying to figure out what your robot is thinking with no screen — you'd have to plug in a USB cable and read text on a computer every time. That's not very practical when your robot is zooming around the room! An OLED display right on the robot gives it a face that shows you exactly what's going on.

The SSD1306 is a tiny OLED (Organic Light-Emitting Diode) screen. Unlike a regular screen that uses a backlight, each pixel on an OLED makes its own light. That means it's super bright, uses very little power, and pure black pixels use zero energy — they're just off!

Our display is 128 pixels wide and 64 pixels tall. We'll keep a **framebuffer** in the Pico's memory — that's a big array where each bit represents one pixel (on or off). When we want to update the screen, we draw into the framebuffer first, then send the whole thing to the display in one burst. It's like drawing a picture on paper before holding it up for everyone to see.

The OLED shares the I2C bus with the MPU6050 IMU at address `0x3C` (the IMU is at `0x68`). They take turns talking on the same two wires, like two kids sharing a walkie-talkie — each one only answers when their name (address) is called.

## Wiring

| SSD1306 Pin | Pico 2 Pin | Notes |
|-------------|------------|-------|
| VCC         | 3V3 (pin 36) | 3.3V power |
| GND         | GND (pin 38) | Ground |
| SDA         | GP4 (pin 6)  | Shared I2C0 data line |
| SCL         | GP5 (pin 7)  | Shared I2C0 clock line |

> **Note:** Same wiring as Lesson 8. If your OLED is already connected, no changes needed!

## The code

```c
#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/i2c.h"

// SSD1306 configuration
#define SSD1306_ADDR    0x3C
#define SSD1306_WIDTH   128
#define SSD1306_HEIGHT  64
#define SSD1306_PAGES   (SSD1306_HEIGHT / 8)

#define I2C_PORT i2c0
#define SDA_PIN  4
#define SCL_PIN  5

// Framebuffer: 128 x 64 bits = 1024 bytes
static uint8_t framebuffer[SSD1306_WIDTH * SSD1306_PAGES];

// 5x7 font for basic ASCII characters (32-126)
// Each character is 5 bytes wide, each byte is a column of 7 pixels
static const uint8_t font_5x7[][5] = {
    {0x00,0x00,0x00,0x00,0x00}, // space
    {0x00,0x00,0x5F,0x00,0x00}, // !
    {0x00,0x07,0x00,0x07,0x00}, // "
    {0x14,0x7F,0x14,0x7F,0x14}, // #
    {0x24,0x2A,0x7F,0x2A,0x12}, // $
    {0x23,0x13,0x08,0x64,0x62}, // %
    {0x36,0x49,0x56,0x20,0x50}, // &
    {0x00,0x08,0x07,0x03,0x00}, // '
    {0x00,0x1C,0x22,0x41,0x00}, // (
    {0x00,0x41,0x22,0x1C,0x00}, // )
    {0x2A,0x1C,0x7F,0x1C,0x2A}, // *
    {0x08,0x08,0x3E,0x08,0x08}, // +
    {0x00,0x80,0x70,0x30,0x00}, // ,
    {0x08,0x08,0x08,0x08,0x08}, // -
    {0x00,0x00,0x60,0x60,0x00}, // .
    {0x20,0x10,0x08,0x04,0x02}, // /
    {0x3E,0x51,0x49,0x45,0x3E}, // 0
    {0x00,0x42,0x7F,0x40,0x00}, // 1
    {0x72,0x49,0x49,0x49,0x46}, // 2
    {0x21,0x41,0x49,0x4D,0x33}, // 3
    {0x18,0x14,0x12,0x7F,0x10}, // 4
    {0x27,0x45,0x45,0x45,0x39}, // 5
    {0x3C,0x4A,0x49,0x49,0x31}, // 6
    {0x41,0x21,0x11,0x09,0x07}, // 7
    {0x36,0x49,0x49,0x49,0x36}, // 8
    {0x46,0x49,0x49,0x29,0x1E}, // 9
    {0x00,0x00,0x14,0x00,0x00}, // :
};

// Send a command byte to the SSD1306
static void ssd1306_cmd(uint8_t cmd) {
    uint8_t buf[2] = {0x00, cmd};  // Co=0, D/C=0
    i2c_write_blocking(I2C_PORT, SSD1306_ADDR, buf, 2, false);
}

// Initialize the SSD1306 display
void ssd1306_init(void) {
    sleep_ms(100);
    ssd1306_cmd(0xAE); // display off
    ssd1306_cmd(0xD5); ssd1306_cmd(0x80); // clock divide
    ssd1306_cmd(0xA8); ssd1306_cmd(0x3F); // multiplex 64
    ssd1306_cmd(0xD3); ssd1306_cmd(0x00); // display offset 0
    ssd1306_cmd(0x40); // start line 0
    ssd1306_cmd(0x8D); ssd1306_cmd(0x14); // charge pump on
    ssd1306_cmd(0x20); ssd1306_cmd(0x00); // horizontal addressing
    ssd1306_cmd(0xA1); // segment remap
    ssd1306_cmd(0xC8); // COM scan direction
    ssd1306_cmd(0xDA); ssd1306_cmd(0x12); // COM pins
    ssd1306_cmd(0x81); ssd1306_cmd(0xCF); // contrast
    ssd1306_cmd(0xD9); ssd1306_cmd(0xF1); // pre-charge
    ssd1306_cmd(0xDB); ssd1306_cmd(0x40); // VCOMH
    ssd1306_cmd(0xA4); // display from RAM
    ssd1306_cmd(0xA6); // normal (not inverted)
    ssd1306_cmd(0xAF); // display on
}

// Push the entire framebuffer to the display
void ssd1306_update(void) {
    ssd1306_cmd(0x21); ssd1306_cmd(0); ssd1306_cmd(127); // column range
    ssd1306_cmd(0x22); ssd1306_cmd(0); ssd1306_cmd(7);   // page range

    // Send framebuffer with data prefix
    uint8_t buf[1 + sizeof(framebuffer)];
    buf[0] = 0x40;  // Co=0, D/C=1 (data)
    memcpy(buf + 1, framebuffer, sizeof(framebuffer));
    i2c_write_blocking(I2C_PORT, SSD1306_ADDR, buf, sizeof(buf), false);
}

// Clear the framebuffer
void ssd1306_clear(void) {
    memset(framebuffer, 0, sizeof(framebuffer));
}

// Set a single pixel
void ssd1306_pixel(int x, int y, bool on) {
    if (x < 0 || x >= SSD1306_WIDTH || y < 0 || y >= SSD1306_HEIGHT) return;
    if (on)
        framebuffer[x + (y / 8) * SSD1306_WIDTH] |= (1 << (y % 8));
    else
        framebuffer[x + (y / 8) * SSD1306_WIDTH] &= ~(1 << (y % 8));
}

// Draw a character at (x, y) using the 5x7 font
void ssd1306_char(int x, int y, char c) {
    if (c < 32 || c > 57 + 32) return;  // limited charset for this example
    int idx = c - 32;
    for (int col = 0; col < 5; col++) {
        uint8_t line = font_5x7[idx][col];
        for (int row = 0; row < 7; row++) {
            ssd1306_pixel(x + col, y + row, (line >> row) & 1);
        }
    }
}

// Draw a string at (x, y)
void ssd1306_text(int x, int y, const char *str) {
    while (*str) {
        ssd1306_char(x, y, *str);
        x += 6;  // 5 pixels + 1 gap
        str++;
    }
}

// Draw a horizontal line
void ssd1306_hline(int x, int y, int w) {
    for (int i = 0; i < w; i++) ssd1306_pixel(x + i, y, true);
}

// Draw a progress bar
void ssd1306_progress_bar(int x, int y, int w, int h, float pct) {
    // Border
    ssd1306_hline(x, y, w);
    ssd1306_hline(x, y + h - 1, w);
    for (int r = 0; r < h; r++) {
        ssd1306_pixel(x, y + r, true);
        ssd1306_pixel(x + w - 1, y + r, true);
    }
    // Fill
    int fill = (int)((w - 4) * pct);
    for (int r = 2; r < h - 2; r++) {
        for (int c = 0; c < fill; c++) {
            ssd1306_pixel(x + 2 + c, y + r, true);
        }
    }
}

// Display robot status screen
void show_robot_status(const char *mode, float battery_v,
                       float speed_pct, int distance_cm) {
    ssd1306_clear();

    // Title bar
    ssd1306_text(0, 0, "PICO ROBOT");
    ssd1306_hline(0, 9, 128);

    // Mode
    ssd1306_text(0, 12, "MODE:");
    ssd1306_text(36, 12, mode);

    // Battery with bar
    ssd1306_text(0, 22, "BATT:");
    ssd1306_progress_bar(36, 21, 50, 9, battery_v / 6.0f);

    // Speed
    ssd1306_text(0, 34, "SPD:");
    ssd1306_progress_bar(36, 33, 50, 9, speed_pct);

    // Distance
    char dist_str[16];
    snprintf(dist_str, sizeof(dist_str), "%d", distance_cm);
    ssd1306_text(0, 46, "DIST:");
    ssd1306_text(36, 46, dist_str);
    ssd1306_text(36 + strlen(dist_str) * 6, 46, "CM");

    ssd1306_update();
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // I2C setup
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    ssd1306_init();
    printf("OLED initialized!\n");

    // Demo: cycle through different statuses
    const char *modes[] = {"IDLE", "LINE", "AVOID", "RC"};
    int mode_idx = 0;
    float battery = 5.2f;
    int distance = 0;

    while (true) {
        float speed = (mode_idx == 0) ? 0.0f : 0.5f + 0.1f * mode_idx;
        show_robot_status(modes[mode_idx], battery, speed, distance);

        distance += 5;
        battery -= 0.01f;
        if (battery < 3.0f) battery = 5.2f;

        sleep_ms(500);
        mode_idx = (mode_idx + 1) % 4;
    }

    return 0;
}
```

## Try it
- Change the status screen to show the gyro heading angle from the IMU
- Add a battery icon that changes shape based on voltage level
- Create a "splash screen" that shows on boot with the robot's name
- Draw a tiny compass arrow that points in the robot's heading direction

## Challenge

Implement a **scrolling log** on the bottom half of the display. When the robot detects an obstacle or changes mode, add a line of text that scrolls up. Keep the last 3 messages visible. This gives you a live event log right on the robot.

## Summary

The OLED display turns our robot from a mystery box into a readable machine. We built a framebuffer-based graphics system that can draw text, lines, and progress bars. The display shares the I2C bus with the IMU seamlessly — each device responds only to its own address. Now at a glance we can see the robot's mode, battery level, speed, and distance traveled.

## How this fits the robot

The OLED is the robot's face — it tells you (and anyone watching) what the robot is doing. When we add the state machine in Project 16, the display will show the current mode. During missions in Project 20, it'll show mission progress. It's the primary way to debug the robot without a computer attached.
