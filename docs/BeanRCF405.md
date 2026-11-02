# BeanRCF405

STM32F405RGT6, flash 1024 KB. Tài liệu này chỉ ghi target ArduPilot của mạch BeanRC.

Repo này chứa firmware đã build và trang tải. Mã nguồn nằm ở `/home/loc_nguyen/ardupilot_qicktune`, nhánh `copter-4.6.3-fft`, thư mục `libraries/AP_HAL_ChibiOS/hwdef/BeanRCF405/`. Copter báo `ArduCopter V4.6.3-qwik`. Plane và Rover báo `V4.6.3` official. Git `92b0cd78`.

BETAF405 là mạch khác. Không lấy pin, DMA, board id, thang pin hay hướng IMU của BeanRC từ target Betaflight hoặc INAV. Board id của BeanRC là 1203. Ảnh có board id khác không phải firmware của mạch này.

## Phần cứng đã đối chiếu

Pinout lấy từ `F405RGT6_PINOUT.docx`. MCU là STM32F405RGT6.

| Chức năng | Chân |
| --- | --- |
| SPI1 IMU ICM-42688-P | SCK PA5, MISO PA6, MOSI PA7, CS PC4, DRDY PC5 |
| SPI2 OSD MAX7456 và SD | SCK PB13, MISO PB14, MOSI PB15, SD CS PC0, OSD CS PC1, detect PB12 active-low |
| I2C1 | SCL PB6, SDA PB7. IST8310 ở 0x0E. BMP388 ở 0x76 |
| USB | PA11, PA12 |
| USART1 RC | TX PA9, RX PA10 |
| USART2 GPS | TX PA2, RX PA3 |
| USART3 | TX PC10, RX PC11 |
| UART4 | TX PA0, RX PA1 |
| UART5 | TX PC12, RX PD2 |
| USART6 | TX PC6, RX PC7 |
| ADC pin | PC2, kênh ADC 12 |
| ADC dòng | PC3, kênh ADC 13 |
| ADC trống | PA4 |
| Còi | PC13, active-low |
| BOOT1 | PB2 |
| Motor 1..12 | PA8, PA15, PB0, PB1, PB3, PB4, PB5, PB8, PB9, PB10, PB11, PC8 |
| LED WS2812 | PC9 |

Không có la bàn ngoài trên mạch. La bàn và baro nằm trên I2C1. Không thêm chip không có trong danh sách này.

## ArduPilot

Thư mục target có bốn file: `hwdef.dat`, `hwdef-bl.dat`, `defaults.parm`, `README.md`. Thư mục này chưa commit trong `ardupilot_qicktune` (trạng thái untracked tại lần ghi tài liệu này). Bootloader đã build nằm ở `Tools/bootloaders/BeanRCF405_bl.bin` và cũng chưa commit.

`APJ_BOARD_ID` là 1203 ở cả app và bootloader. 1202 đã dùng cho AtomRCF405. 1203 là id cục bộ, chưa được ArduPilot upstream cấp.

Flash: sector 0 là bootloader, sector 1 và 2 là tham số (`STORAGE_FLASH_PAGE 1`, `HAL_STORAGE_SIZE` 16384), firmware bắt đầu ở 48 KB (`FLASH_RESERVE_START_KB 48`). Bootloader load 48 KB và kéo PB2 xuống thấp. `ENABLE_DFU_BOOT 1` có ở cả hai file.

`SERIAL_ORDER` bắt đầu bằng `OTG1`. UART không dùng DMA vì DMA1 và DMA2 dành cho motor, IMU, OSD và I2C. Mặc định trong hwdef: SERIAL1 là RC input, SERIAL2 là GPS, SERIAL3..6 là None. `defaults.parm` đè lại: SERIAL1 tắt, GPS trên SERIAL2, RC (protocol 23) trên SERIAL3. Tham số đã lưu trên mạch vẫn thắng file này.

IMU: `IMU Invensensev3`, SPI mode 3, probe 1 MHz, chạy 8 MHz, hướng `ROTATION_PITCH_180_YAW_90`. Probe lỗi vẫn boot (`HAL_INS_TEMP_NO_IMU`, `HAL_INS_REPORT_WHOAMI_FAIL`). WHOAMI đúng là 0x47. Byte khác hiện trong Mission Planner Messages. Không arm khi byte đó sai.

La bàn: `COMPASS IST8310 I2C:0:0x0E` với `ROTATION_ROLL_180`. `HAL_COMPASS_FORCE_INTERNAL` xoá `COMPASS_EXTERNAL` 1 và `COMPASS_ORIENT` 8 đã lưu, để Roll180 không bị áp hai lần. `HAL_AHRS_ORIENTATION_FIXED ROTATION_NONE` để hướng 26 đã lưu không cộng thêm lên IMU. `COMPASS_AUTO_ROT` giữ mặc định thư viện (2). `FRAME_TYPE` không nằm trong defaults.

Baro: `BARO BMP388 I2C:0:0x76`. Vẫn cho boot khi không có baro. Sau `minimize_fpv_osd.inc` thì bật lại probe baro I2C ngoài.

OSD MAX7456 và SD trên SPI2, mode 0. Font OSD `font0.bin` được nhúng ROMFS. LED thông báo mặc định là loại 256 (không có LED trạng thái trên PB2).

Hwdef kéo theo `minimize_fpv_osd.inc` để vừa flash 1 MB. Include đó tắt nhiều driver ít dùng, giữ khung quad, hexa và octa, tắt optical flow, prec land, ICE, advanced failsafe và pin SMBUS.

### DMA motor

Timer hệ thống là TIM5. TIM1, TIM2, TIM3, TIM4 và TIM8 là timer ngõ ra.

| Ngõ | Chân | Timer | Bidirectional DShot |
| --- | --- | --- | --- |
| 1 | PA8 | TIM1 CH1 | DMA riêng |
| 2 | PA15 | TIM2 CH1 | DMA riêng, đọc luôn motor 5 |
| 3 | PB0 | TIM3 CH3 | dùng chung motor 4 |
| 4 | PB1 | TIM3 CH4 | DMA riêng, đọc luôn motor 3 |
| 5 | PB3 | TIM2 CH2 | dùng chung motor 2 |
| 6 | PB4 | TIM3 CH1 | DMA riêng, đọc luôn motor 7. Stream dùng chung SPI2 TX |
| 7 | PB5 | TIM3 CH2 | dùng chung motor 6 |
| 8 | PB8 | TIM4 CH3 | DMA riêng. Stream dùng chung I2C1 TX |
| 9 | PB9 | TIM4 CH4 | Chỉ DShot. Không có DMA TIM4 CH4. Tắt ngõ này khi motor 8 bidirectional |
| 10 | PB10 | TIM2 CH3 | Chỉ DShot. Tắt khi motor 2 và 5 bidirectional |
| 11 | PB11 | TIM2 CH4 | Chỉ DShot. Tắt khi motor 2 và 5 bidirectional |
| 12 | PC8 | TIM8 CH3 | Chung timer với LED PC9 |

`BIDIR` chỉ đặt trên M1, M2, M4, M6, M8. Đặt thêm lên M3, M5 hoặc M7 sẽ xin stream đang bị cặp kia giữ. `DMA_NOSHARE` giữ `TIMx_UP`, TIM1 CH1, TIM2 CH1, TIM3 CH4, SPI1 và ADC tách khỏi nhau. `DMA_PRIORITY` để các stream UP và kênh chủ được nhận trước I2C và SPI.

### defaults.parm

File lấy từ `beanrc1.param`, chỉ phần PID, rate và thiết lập ngoại vi. Không chép offset, device id, EKF, failsafe hay flight mode.

Motor 1..4 là DShot300 (`MOT_PWM_TYPE 5`), ESC BLHeli_S / Bluejay (`SERVO_DSHOT_ESC 2`), bidirectional mask 15, 14 cực từ. SERVO9..12 để function 0. SERVO13 function 120 là LED. Pin analog, dung lượng ghi 3300 mAh, ngưỡng thấp 10.5 V. Thang đo 11.0 và 40 chưa hiệu chuẩn. OSD screen 1 theo layout trong param đó.

Plane và Rover dùng chung `defaults.parm`. Tham số Copter như `ATC_*` và `PSC_*` không có trên vehicle kia thì firmware bỏ qua lúc khởi động. Function 33..36 vẫn có nghĩa Motor1..4 trên Plane và Rover, nên ảnh Plane hoặc Rover sau khi reset tham số sẽ gán bốn ngõ đầu là motor DShot, không phải cánh hoặc lái.

### Build

Toolchain trên máy này: `arm-none-eabi-gcc` 10.3.1, Python 3.10, `ccache`.

```
cd /home/loc_nguyen/ardupilot_qicktune
Tools/scripts/build_bootloaders.py BeanRCF405
./waf configure --board BeanRCF405
./waf copter
./waf plane
./waf rover
```

Sản phẩm nằm ở `build/BeanRCF405/bin/`. File đưa vào repo này mang hậu tố `-bl`: `arducopter-bl.apj`, `arducopter-bl.hex`, và cùng kiểu cho Plane và Rover.

Nạp lần đầu bằng hex có bootloader, qua SWD: `transport select swd`, `reset_config none`, tốc độ adapter 100. Core halt sau khi nạp. Người dùng tự reset mạch. Cập nhật sau dùng `.apj` với bootloader USB `1209:5741`. DFU ROM là `0483:DF11` tại `0x1FFF0000` và không cứu được thạch anh nếu HSE chưa chạy.

## Repo phát hành

Trang tải nằm ở `web/`. Catalog đọc cây GitHub `LocFPV1502/FIRMWARE_BeanRCF405` nhánh `main`. Khi API lỗi, `web/src/catalog.js` dùng `FALLBACK_FILES`. File `-bl.apj` là cập nhật GCS. File `-bl.hex` là nạp lần đầu.

Ảnh ArduPilot của BeanRC nằm ở `ardupilot_4.6.3/`.

- Có bdshot: board id 1203, tên `*-bl.apj` và `*-bl.hex`.
- Không bdshot: board id 1204, build `BeanRCF405-DShot`, tên `*-nobd-bl.apj` và `*-nobd-bl.hex`.

Hai board id cố ý khác nhau. APJ chỉ cập nhật đúng bootloader cùng id. File Copter từng có trong thư mục này mang board id 1125 và đã được thay.

## Giá trị chưa đo lại trong lần ghi này

Giữ như đang ghi trong hwdef BeanRC. Không đổi nếu chưa có phép đo mới trên mạch này.

- Thạch anh 8 MHz. Pinout không liệt kê PH0/PH1.
- `BATT_VOLT_MULT` 11.0 và `BATT_AMP_PERVLT` 40. Hai số này chưa hiệu chuẩn.
- Mức còi active-low.
- Hướng IMU `ROTATION_PITCH_180_YAW_90` và la bàn `ROTATION_ROLL_180`. Một hiệu chuẩn accel sáu mặt vẫn qua được khi trục lệch 90 độ. Offset accel áp sau phép quay của driver.
- Offset la bàn lưu theo thân máy. Đổi hướng IMU thì calibrate lại accel. Đổi hướng la bàn thì calibrate lại offset la bàn.

## Bản build 2026-11-02

Đã build từ `/home/loc_nguyen/ardupilot_qicktune`, board `BeanRCF405`, `APJ_BOARD_ID` 1203, git `92b0cd78`. Toolchain `arm-none-eabi-gcc` 10.3.1. Flash dùng được sau bootloader là 999424 byte. `AUTOBUILD_TARGETS` là `Copter Plane Rover`.

| Ảnh | Flash đã dùng | Flash còn | File trong repo |
| --- | --- | --- | --- |
| ArduCopter V4.6.3-qwik | 926751 | 72612 | `arducopter-bl.apj` 843710 byte, `arducopter-bl.hex` 2684156 byte |
| ArduPlane V4.6.3 | 972903 | 26508 | `arduplane-bl.apj` 889522 byte, `arduplane-bl.hex` 2810964 byte |
| ArduRover V4.6.3 | 835495 | 163916 | `ardurover-bl.apj` 771891 byte, `ardurover-bl.hex` 2433060 byte |

Plane còn khoảng 26 KB. Lần build sau nếu link tràn thì tắt feature trong hwdef BeanRC, không bỏ IMU, timer motor, hoặc OSD.

Cây này không bật `AP_CHECK_FIRMWARE_ENABLED`, nên waf in `No APP_DESCRIPTOR found`. Đó là cấu hình mặc định của bản 4.6.3 khi không truyền `--enable-check-firmware`, không phải lỗi link. Chưa nạp lên mạch.
