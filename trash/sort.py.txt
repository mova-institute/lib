import argparse
import sys
import functools
import re
import ctypes


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument('file', type=argparse.FileType('r+'), default=sys.stdin)
  # parser.add_argument('output', type=argparse.FileType('+'), default=sys.stdout)
  args = parser.parse_args()

  lines = []
  for l in args.file:
    lines.append(l[:-1])

  # locale = Locale('uk_UA')
  # lines = sorted(lines, key=locale.strxfrm)
  lines = sorted(lines, key=functools.cmp_to_key(mimic_strxfrm_cmp))
  args.file.seek(0)
  args.file.write('\n'.join(lines))


# LC_ALL_MASK = 8127


# class Locale(object):
#     def __init__(self, locale):
#         # LC_COLLATE_MASK = 8
#         self.libc = ctypes.CDLL("libglib-2.0.dylib")
#         self.ctx = self.libc.newlocale(LC_ALL_MASK, locale, 0)

#     def strxfrm(self, src, iteration=1):
#         size = 3 * iteration * len(src)
#         dest = ctypes.create_string_buffer(b'\000' * size)
#         n = self.libc.strxfrm_l(dest, src, size, self.ctx)
#         if n < size:
#             return dest.value
#         elif iteration <= 4:
#             return self.strxfrm(src, iteration + 1)
#         else:
#             raise Exception('max number of iterations trying to increase dest reached')

#     def __del__(self):
#         self.libc.freelocale(self.ctx)


def mimic_strxfrm_cmp(a, b):
  if a == b:
    return 0
  a_norm = re.sub('\W', '', a).lower()
  b_norm = re.sub('\W', '', b).lower()
  if a_norm == b_norm:
    return mimic_strxfrm_sort_key(a) > mimic_strxfrm_sort_key(b) and 1 or -1

  return mimic_strxfrm_sort_key(a_norm) > mimic_strxfrm_sort_key(b_norm) and 1 or -1


UK_ALPHABET_MAP = {key: value for value, key in enumerate(
  "<>-'0123456789АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя")}


def mimic_strxfrm_sort_key(word):
  ret = []
  for c in word:
    if c in UK_ALPHABET_MAP:
      ret.append(UK_ALPHABET_MAP[c])
    elif re.match("[a-zA-Z_]", c):
      ret.append(len(UK_ALPHABET_MAP) + ord(c))
    else:
      ret.append(len(UK_ALPHABET_MAP) + ord(c) + ord("z"))

  return ret


if __name__ == "__main__":
  main()
