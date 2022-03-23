import { promises as fsp } from 'fs';
import { resolve } from 'path';
import { Md5 } from 'ts-md5';

import Color from 'color';

import {
  parseBuffer,
  normalizeBlocks,
  isSeriesHasSameSize,
  createMosaic,
} from '../src/index';

describe('radar-echo-utils test', () => {
  describe('[parseBuffer]', () => {
    test('should work right', async () => {
      const buffer = await fsp.readFile(
        resolve(__dirname, 'fixtures/MOSAICETA000.20220217.120000.latlon'),
      );
      const block = parseBuffer(buffer.buffer);
      expect(block).toBeTruthy();
      expect(block.rows).toBe(4200);
      expect(block.cols).toBe(6200);
    });
  });

  describe('[normalizeBlocks]', () => {
    test('should work right', async () => {
      const buffer1 = await fsp.readFile(
        resolve(__dirname, 'fixtures/MOSAICETA000.20220217.120000.latlon'),
      );
      const buffer2 = await fsp.readFile(
        resolve(__dirname, 'fixtures/MOSAICETA000.20220217.121000.latlon'),
      );
      const block1 = parseBuffer(buffer1.buffer);
      const block2 = parseBuffer(buffer2.buffer);
      expect(() => isSeriesHasSameSize(block1, block2)).not.toThrowError();
      const { min_value, max_value } = normalizeBlocks(block1, block2);
      expect(min_value).toBe(0);
      expect(max_value).toBe(120);
    });
  });

  describe('[createMosaic]', () => {
    test('should work right', async () => {
      const buffer1 = await fsp.readFile(
        resolve(__dirname, 'fixtures/MOSAICETA000.20220217.120000.latlon'),
      );
      const buffer2 = await fsp.readFile(
        resolve(__dirname, 'fixtures/MOSAICETA000.20220217.121000.latlon'),
      );
      const block1 = parseBuffer(buffer1.buffer);
      const block2 = parseBuffer(buffer2.buffer);
      const { infos, min_value, max_value, rows, cols } = normalizeBlocks(
        block1,
        block2,
      );
      // const scale = D3.scaleLinear()
      //   .domain([min_value, max_value])
      //   .range(['transparent', 'red'] as any);
      const half = (max_value + min_value) / 2;
      const buffer = createMosaic({
        ignore: (v) => v < min_value || v > max_value,
        iterpolation: (v) => {
          const color = Color(v < half ? 'transparent' : 'red');
          return color.rgb().array() as [number, number, number];
        },
        rows,
        cols,
        backgroundColor: [0, 0, 0],
      })(...infos.map((info) => info.forEach));
      const hash = new Md5();
      hash.appendByteArray(new Uint8Array(buffer));
      expect(buffer.byteLength).toBe(rows * cols * 4);
      expect(hash.end()).toMatchSnapshot();
    });
  });
});
