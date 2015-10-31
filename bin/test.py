import dawg

d = dawg.CompletionDAWG()
d.load('../data/dawg.dic')

print(d.keys('abcde'))