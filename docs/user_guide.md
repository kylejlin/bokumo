# Bokumo User Guide

## Getting Started

### Part 1. Configure and launch

1. Download a `bokumo.json` file and a background music (hereafter referred to as "BGM") file. A sample can be found in [this directory](../samples/c4_120bpm).
2. Open [https://kylejlin.github.io/bokumo](https://kylejlin.github.io/bokumo).
3. Click the "Choose Files" button (the exact text of the button may vary depending on your browser).
4. Select the `bokumo.json` file AND the BGM file. **You cannot upload these one at a time--you must upload them simulatenously.**
5. Click Launch.
6. Grant microphone permission when asked.

### Part 2. Record

1. Click the "Record" button. This will cause the BGM to start playing.
2. Start singing at the appropriate part of the BGM.
3. Once the BGM stops, a WAV file containing the recording will automatically be downloaded.
4. Click the "Previous" or "Next" button to move on to the next recording.

## Customizing `bokumo.json`

Let's look at a sample `bokumo.json` file.

```json
{
  "bgm_file_name": "C4.wav",
  "playback_start_in_ms": 0,
  "recording_start_in_ms": 2000,
  "recording_stop_in_ms": 4750,
  "playback_stop_in_ms": 6000,
  "reference_lines_in_ms": [
    "recording_start_in_ms",
    1250,
    "recording_stop_in_ms"
  ],
  "reference_lines_in_hz": [261.63],
  "recording_names": ["a_a_i_u_e_o", "ka_ka_ki_ku_ke_ko", "sa_sa_se_si_su_so"],
  "spectrogram_max_frequency_in_hz": 8000
}
```

We will describe each field below. Observe that all time values are given in
milliseconds relative to the start of the BGM file.

| Field                             | Description                                                                                                                                                                                                                                                                                                                                                                                                                                   | Examples                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `bgm_file_name`                   | The file name of the BGM. This **must** match the name of the BGM file you upload.                                                                                                                                                                                                                                                                                                                                                            | `"C4.wav"`                                                                        |
| `playback_start_in_ms`            | When the playback should start, relative to the start of the BGM file. For example, if the value is `1500`, then the first 1.5 seconds of the BGM file will be skipped.                                                                                                                                                                                                                                                                       | `0`                                                                               |
| `recording_start_in_ms`           | When the recording should start, relative to the start of the BGM file. For example, if `playback_start_in_ms` is `1500` and `recording_start_in_ms` is `2700`, then the recording will start `2700 - 1500 = 1200` milliseconds (i.e., 1.2 seconds) after the playback starts. This value **must** be greater than or equal to `playback_start_in_ms`.                                                                                        | `2000`                                                                            |
| `recording_stop_in_ms`            | When the recording should stop, relative to the start of the BGM file. This value **must** be greater than or equal to `recording_start_in_ms`.                                                                                                                                                                                                                                                                                               | `4750`                                                                            |
| `playback_stop_in_ms`             | When the recording should stop, relative to the start of the BGM file. This value **must** be greater than or equal to `recording_stop_in_ms`.                                                                                                                                                                                                                                                                                                | `6000`                                                                            |
| `reference_lines_in_ms`           | A list of reference lines to draw over the spectrogram. Times are given in milliseconds relative to the start of the BGM file. Alternatively, you can write `"recording_start_in_ms"` or `"recording_stop_in_ms"` to reference the values in those fields. <br> Don't be worried if the spectrogram doesn't perfectly overlap with the reference lines--there is some expected latency between your microphone and the spectrogram rendering. | `[]` <br> `[2000]` <br> `["recording_start_in_ms", 2000, "recording_stop_in_ms"]` |
| `reference_lines_in_hz`           | Reference lines in Hertz. For example, if your target pitch is Middle A, then you may want to draw a reference line at `440`.                                                                                                                                                                                                                                                                                                                 | `440`                                                                             |
| `recording_names`                 | The names of the files to be downloaded.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `spectrogram_max_frequency_in_hz` | The maximum range of the spectrogram in Hertz. The spectrogram has a fixed height, so if you set this too high, the spectrogram will vertically "zoom-out", which will make it hard to see.                                                                                                                                                                                                                                                   | `1000` <br> `2000` <br> `8000`                                                    |

It is highly recommended that you start recording a little before the target region, and stop recording a little after.
For example, if your BGM plays 4 quarter notes starting at t=2000ms and ending at t=4000ms, you might record from 1000ms to 5000ms.
We recommend erring on the conservative side, since you can always eliminate
excess audio during the oto-ing process, but you can't recover audio that got cutoff due to overaggressive recording parameters.
