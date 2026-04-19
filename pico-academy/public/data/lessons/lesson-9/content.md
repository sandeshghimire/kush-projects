# SPI — Fast Serial Communication

## What you'll learn
- What the SPI protocol is and how it differs from I2C
- How SPI uses four wires for full-duplex communication
- How to configure the Pico's SPI peripheral
- How to read and write data to an SD card module
- When to choose SPI vs I2C for your projects

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- 1× MicroSD card breakout module (~$3)
- 1× MicroSD card (~$5)
- 6× jumper wires (~$0.60)

## Background

I2C is great when you have many slow devices sharing two wires. But sometimes you need **speed**. That's where **SPI** comes in. SPI (Serial Peripheral Interface) is like a four-lane highway compared to I2C's two-lane road. It can transfer data at up to 65 MHz on the Pico — over 160 times faster than I2C fast mode!

SPI uses four wires: **MOSI** (Master Out, Slave In) sends data from the Pico to the device; **MISO** (Master In, Slave Out) sends data back; **SCK** (Serial Clock) keeps everything synchronized; and **CS** (Chip Select) tells which device to listen. Because MOSI and MISO are separate wires, SPI is **full-duplex** — it can send and receive at the same time, like a phone call vs. a walkie-talkie.

Think of CS like calling someone's name in a crowded room. Only the device whose CS pin is pulled LOW will respond. This lets you connect multiple SPI devices to the same MOSI/MISO/SCK wires — just give each one its own CS pin.

An SD card is a perfect SPI project. SD cards actually support SPI mode — they're one of the most common SPI devices in the embedded world. We'll use SPI to send commands to the card and read/write data in 512-byte blocks.

## Wiring

| Pico Pin | SD Module Pin |
|----------|---------------|
| GP19 (SPI0 TX/MOSI) | MOSI |
| GP16 (SPI0 RX/MISO) | MISO |
| GP18 (SPI0 SCK) | SCK |
| GP17 (SPI0 CS) | CS |
| 3V3 | VCC |
| GND | GND |

## The code

```c
#include "pico/stdlib.h"
#include "hardware/spi.h"
#include <stdio.h>
#include <string.h>

#define SPI_PORT  spi0
#define PIN_MISO  16
#define PIN_CS    17
#define PIN_SCK   18
#define PIN_MOSI  19

// Pull CS low to select the device
void cs_select(void) {
    gpio_put(PIN_CS, 0);
}

// Pull CS high to deselect the device
void cs_deselect(void) {
    gpio_put(PIN_CS, 1);
}

// Send and receive a single byte over SPI
uint8_t spi_transfer(uint8_t tx_byte) {
    uint8_t rx_byte;
    spi_write_read_blocking(SPI_PORT, &tx_byte, &rx_byte, 1);
    return rx_byte;
}

// Send a command to the SD card in SPI mode
uint8_t sd_send_cmd(uint8_t cmd, uint32_t arg) {
    cs_select();

    // Send 6-byte command frame
    spi_transfer(0x40 | cmd);           // Start bit + command
    spi_transfer((arg >> 24) & 0xFF);   // Argument byte 3
    spi_transfer((arg >> 16) & 0xFF);   // Argument byte 2
    spi_transfer((arg >> 8) & 0xFF);    // Argument byte 1
    spi_transfer(arg & 0xFF);           // Argument byte 0
    spi_transfer(cmd == 0 ? 0x95 : 0x87); // CRC (required for CMD0/CMD8)

    // Wait for response (up to 8 bytes)
    uint8_t response;
    for (int i = 0; i < 8; i++) {
        response = spi_transfer(0xFF);
        if (response != 0xFF) break;
    }

    cs_deselect();
    spi_transfer(0xFF);  // Extra clock cycles

    return response;
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Initialize SPI at 1 MHz (slow for SD card init)
    spi_init(SPI_PORT, 1000 * 1000);
    gpio_set_function(PIN_MISO, GPIO_FUNC_SPI);
    gpio_set_function(PIN_SCK, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MOSI, GPIO_FUNC_SPI);

    // CS is manual GPIO (not SPI hardware controlled)
    gpio_init(PIN_CS);
    gpio_set_dir(PIN_CS, GPIO_OUT);
    gpio_put(PIN_CS, 1);  // Deselected

    // Send 80 clock pulses with CS high (SD card init sequence)
    cs_deselect();
    for (int i = 0; i < 10; i++) {
        spi_transfer(0xFF);
    }

    // CMD0: Reset card into SPI mode
    printf("Sending CMD0 (reset)...\n");
    uint8_t r = sd_send_cmd(0, 0);
    printf("CMD0 response: 0x%02X %s\n", r, r == 0x01 ? "(OK)" : "(error)");

    // CMD8: Check voltage range (required for SDHC)
    printf("Sending CMD8 (check voltage)...\n");
    r = sd_send_cmd(8, 0x000001AA);
    printf("CMD8 response: 0x%02X\n", r);

    // Speed up SPI now that card is initialized
    spi_set_baudrate(SPI_PORT, 4 * 1000 * 1000);  // 4 MHz
    printf("SPI speed increased to 4 MHz\n");

    printf("SD card SPI communication established!\n");

    // Basic read/write operations would follow here
    while (true) {
        sleep_ms(1000);
    }

    return 0;
}
```

### How the code works

1. `spi_init(spi0, 1000000)` starts SPI0 at 1 MHz. SD cards need slow speeds during initialization.
2. `spi_write_read_blocking()` sends one byte while simultaneously receiving one byte — that's full-duplex!
3. We control CS manually with `gpio_put` because we need precise control over when the SD card is selected.
4. SD cards require a specific initialization sequence: 80 clock pulses, then CMD0 to enter SPI mode.

## Try it

1. **Speed test** — Measure how fast you can transfer 1 KB of data at different SPI clock rates.
2. **Multiple devices** — Add a second SPI device (like an SPI OLED) with its own CS pin and switch between them.
3. **Read card info** — Send CMD9 to read the SD card's CSD register and print the card capacity.

## Challenge

Write a complete SD card sector reader: send CMD17 (READ_SINGLE_BLOCK) to read a 512-byte sector from the card and print it as a hex dump over serial. This is the foundation for reading files from an SD card!

## Summary

SPI is a fast, full-duplex serial protocol using four wires (MOSI, MISO, SCK, CS). It's ideal for high-speed devices like SD cards and fast displays. The Pico can run SPI at up to 65 MHz. You learned to initialize SPI, transfer bytes, and communicate with an SD card using the standard command protocol. SPI and I2C together let you connect to almost any sensor or peripheral!
