# Agent làm việc với BeanRCF405

Repo này là nơi thả firmware và trang tải. Mã nguồn nằm ở cây khác. Đọc `docs/BeanRCF405.md` trước khi sửa hwdef, target, hoặc defaults.

Trả lời người dùng bằng tiếng Việt. Không nạp firmware trừ khi được yêu cầu. Không bảo arm hoặc bay khi WHOAMI sai, hoặc khi ảnh vừa build chỉ để kiểm tra trên bàn.

## Cây nguồn

BeanRC chỉ build từ ArduPilot tại `/home/loc_nguyen/ardupilot_qicktune`, nhánh `copter-4.6.3-fft`, target `libraries/AP_HAL_ChibiOS/hwdef/BeanRCF405/`.

BETAF405 là mạch khác. Cây Betaflight và cây INAV không phải tài liệu của mạch này. Không đọc target của chúng để sửa pin, DMA, board id, thang pin, hay hướng IMU của BeanRC.

Hai ảnh ArduPilot của cùng mạch BeanRC:

- `BeanRCF405`, board id 1203, có bidirectional DShot. File `arducopter-bl.apj` và `arducopter-bl.hex`, cùng kiểu cho Plane và Rover.
- `BeanRCF405-DShot`, board id 1204, chỉ DShot một chiều. File `arducopter-nobd-bl.apj` và `arducopter-nobd-bl.hex`, cùng kiểu cho Plane và Rover.

Không đổi 1204 thành 1203. Bootloader chỉ nhận APJ đúng board id của nó. Đổi giữa có bdshot và không bdshot thì nạp file HEX lần đầu, không nạp chéo bằng APJ.

File `.apj` để cập nhật qua Mission Planner. File `.hex` để nạp lần đầu. Sửa kích thước tương ứng trong `web/src/catalog.js` (`FALLBACK_FILES`). Không commit, không push, trừ khi được yêu cầu.

## Build ArduPilot

Từ gốc `ardupilot_qicktune`. Bootloader phải có trước khi link vehicle: `Tools/bootloaders/BeanRCF405_bl.bin`.

```
Tools/scripts/build_bootloaders.py BeanRCF405
./waf configure --board BeanRCF405
./waf copter
./waf plane
./waf rover
```

`waf` khoá một build directory. Không chạy hai lệnh `waf` cùng lúc. Sau khi sửa `hwdef.dat` hoặc `defaults.parm`, đọc `build/BeanRCF405/hwdef.h`. Nếu macro probe còn cũ, hoặc `./waf copter` xong trong vài giây, xoá `hwdef.h`, `hw.dat` và `ldscript.ld` trong thư mục build đó rồi build lại.

Flash F405 là 1024 KB, firmware bắt đầu sau 48 KB bootloader. Nếu link tràn, tắt feature trong hwdef rồi build lại. Không bỏ IMU, timer motor đã yêu cầu, hoặc OSD trừ khi người dùng nói vậy.

`AUTOBUILD_TARGETS` chỉ ghi vehicle nào link được. Board id `1203` là id cục bộ, chưa đăng ký upstream. Giữ cùng id trong `hwdef.dat` và `hwdef-bl.dat`.

## Việc không được bịa

Pinout gốc là `F405RGT6_PINOUT.docx`. Những giá trị sau không có trong pinout. Giữ nguyên và ghi rõ là giả định cho đến khi có số đo mới:

- HSE 8 MHz (`OSCILLATOR_HZ 8000000`).
- Thang pin `BATT_VOLT_MULT` 11.0 và `BATT_AMP_PERVLT` 40.
- Còi active-low trên PC13.
- Hướng IMU và la bàn đã đo và đang ghi trong hwdef. Không đổi `ROTATION_*` khi chưa có phép đo mới. Không đặt `INS_ORNT_AUTO 1` để tự đoán.

Không thêm baro, la bàn, hay flash chip không có trên mạch. IMU là ICM-42688-P, WHOAMI thanh ghi 0x75 phải là 0x47. La bàn onboard là IST8310 ở I2C 0x0E. Baro onboard là BMP388 ở I2C 0x76. OSD là MAX7456, thẻ nhớ SPI, cả hai trên SPI2.

## DMA và ngõ ra

Đọc lại `hwdef.dat` trước khi đổi timer. Các ràng buộc đã chốt:

- Bidirectional DShot trên ngõ 1..8. Chỉ gắn `BIDIR` lên kênh sở hữu DMA của cặp: M1, M2, M4, M6, M8. Không gắn `BIDIR` lên M3, M5, M7.
- M9 (TIM4 CH4) chỉ DShot thường. Tắt SERVO9 khi M8 chạy bidirectional.
- M10 và M11 dùng TIM2 cùng M2/M5. Tắt SERVO10 và SERVO11 khi ngõ 2 và 5 chạy bidirectional.
- M12 và LED (PC9) chung TIM8. Không dùng cả hai cùng lúc.
- `TIMx_UP` của motor và SPI1 IMU là `DMA_NOSHARE`.
- UART để `NODMA`. Không đặt `NODMA` cho SPI hoặc I2C trên F405.
- `STM32_ST_USE_TIMER` là TIM5. Không gắn PWM vào timer này.

`defaults.parm` là tune Copter lấy từ `beanrc1.param` (PID, DShot300, mặt nạ bidirectional 15 cho motor 1..4, GPS trên SERIAL2, RC trên SERIAL3). Plane và Rover nhúng cùng file. Tham số không có trên vehicle đó bị bỏ qua lúc boot. `SERVO1`..`SERVO4` function 33..36 là Motor1..4 trên cả ba vehicle. Người dùng Plane hoặc Rover phải gán lại servo sau khi reset tham số. Không sửa file này để “làm sạch” giúp Plane nếu chưa được yêu cầu.

PB2 là BOOT1. Hwdef kéo chân này xuống thấp và không dùng nó làm LED. Không đổi hướng IMU `ROTATION_PITCH_180_YAW_90` hay la bàn `ROTATION_ROLL_180` khi chưa có phép đo mới trên chính mạch BeanRC.

Chuỗi version Copter trong cây này là `ArduCopter V4.6.3-qwik` (dev). Plane và Rover là `V4.6.3` official. Đừng đưa chuỗi Copter về official nếu chưa được yêu cầu.

## Nạp

Lần đầu trên F405: `arducopter-bl.hex`, `arduplane-bl.hex`, hoặc `ardurover-bl.hex` qua SWD. OpenOCD: `transport select swd`, `reset_config none`, tốc độ adapter 100. Tốc độ mặc định trong `stm32f4x.cfg` không init được. Core dừng ở trạng thái halt. Bảo người dùng tự reset mạch.

Cập nhật sau đó dùng file `.apj` qua bootloader USB ArduPilot (`1209:5741`). `ENABLE_DFU_BOOT 1` cho phép reboot DFU vào ROM `0x1FFF0000` (`0483:DF11`). Reboot đó không sửa được thạch anh nếu HSE chưa chạy.

Tham số đã lưu trên mạch đè `defaults.parm` cho đến khi người dùng reset tham số.
