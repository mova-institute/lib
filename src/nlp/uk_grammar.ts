import { Degree, Pos } from './morph_features'

const INFLECTABLE_POSES = [
  Pos.adjective,
  Pos.cardinalNumeral,
  Pos.noun,
  // Pos.verb,
]
//[Pos.adverb, Pos.conjunction, Pos.interjection,
// Pos.particle, Pos.preposition, Pos.punct, Pos.punct, Pos.sym, Pos.x]

export function inflectsCase(pos: Pos) {
  return [Pos.adjective, Pos.cardinalNumeral, Pos.noun].includes(pos)
}

export function isInflecable(pos: Pos) {
  return INFLECTABLE_POSES.includes(pos)
}

export function toPositive(comparativeLemma: string, degree: Degree) {
  if (degree !== Degree.comparative) {
    return
  }
  {
    let fromDict = degreeDict.find(([, cmp]) =>
      cmp.some((x) => x === comparativeLemma),
    )
    if (fromDict) {
      return fromDict[0][0]
    }
  }
  if (comparativeLemma.endsWith('іший')) {
    // return comparativeLemma.substring(0, -'іший'.length) + 'ий'
  }
}

// temp
export const degreeDict: Array<
  [positive: Array<string>, comparative: Array<string>]
> = [
  [['великий'], ['більший']],
  // [[''], ['більш']],
  // [[''], ['кращий']],
  // [['старий'], ['старший']],
  [['малий'], ['менший']],
  [['високий'], ['вищий']],
  [['широко'], ['ширший']],
  [['дальній'], ['дальший']],
  [['низький'], ['нижчий']],
  [['довгий'], ['довший']],
  [['близький'], ['ближчий']],
  [['молодий'], ['молодший']],
  [['короткий'], ['коротший']],
  [['давній'], ['давніший']],
  [['синій'], ['синіший']],
  [['поганий'], ['гірший']],
  [['тонкий'], ['тонший']],
  // [['хутко'], ['хутчій']],
  [['тяжкий'], ['тяжчий']],
  [['солодкий'], ['солодший']],
  [['м’яко'], ['м’якший']],
  // [[''], ['мерщій']],
  // [[''], ['ліпший']],
  [['дужий'], ['дужчий']],
  [['дорогий'], ['дорожчий']],
  [['грубо'], ['грубший']],
  [['вузький'], ['вужчий']],
  [['багатий'], ['багатший']],
  [['багато'], ['більше']],

  [['рано'], ['раніше']],
  [['пізно'], ['пізніше']],
  [['добре'], ['краще']],
  [['мало'], ['менше', 'менш']],
  [['високо'], ['вище']],
  [['швидко'], ['швидше']],
  [['часто'], ['частіше']],
  [['низько'], ['нижче']],
  [['довго'], ['довше']],
  [['погано'], ['гірше']],
  [['скоро'], ['скоріше']],
  [['старо'], ['старше']],
  [['рідко'], ['рідше']],
  [['близько'], ['ближче']],
  [['легко'], ['легше']],
  [['докладно'], ['докладніше']],
  [['широко'], ['ширше']],
  [['цікаво'], ['цікавіше']],
  [['точно'], ['точніше']],
  [['просто'], ['простіше']],
  [['повільно'], ['повільніше']],
  [['зручно'], ['зручніше']],
  [['ефективно'], ['ефективніше']],
  [['дешево'], ['дешевше']],
  [['давно'], ['давніше']],
  [['глибоко'], ['глибше']],
  [['щільно'], ['щільніше']],
  [['холодно'], ['холодніше']],
  [['тихо'], ['тихіше']],
  [['скромно'], ['скромніше']],
  [['скорий'], ['скорше']], // ~
  [['складно'], ['складніше']],
  [['рівно'], ['рівніше']],
  [['раціональний'], ['раціональніше']],
  [['північно'], ['північніше']],
  [['прямо'], ['пряміше']],
  [['прикро'], ['прикріше']],
  [['помірковано'], ['поміркованіше']],
  [['повно'], ['повніше']],
  [['очевидно'], ['очевидніше']],
  [['охоче'], ['охочіше']],
  [['коротко'], ['коротше']],
  [['клопітно'], ['клопітніше']],
  [['дужо'], ['дужче']],
  [['дорого'], ['дорожче']],
  [['дбайливо'], ['дбайливіше']],
  // [['далі'], ['дальше']],
  [['вірно'], ['вірніше']],
  [['важко'], ['важче']],
  [['безпечно'], ['безпечніше']],

  // [['небезпечний'], ['небезпечніший']],
  // [['сильно'], ['сильніше']],
  // [['пізно'], ['пізніший']],
  // [['цікавий'], ['цікавіший']],
  // [['теплий'], ['тепліший']],
  // [['смачний'], ['смачніший']],
  // [['повільний'], ['повільніший']],
  // [['ніжно'], ['ніжніший']],
  // [['красивий'], ['красивіший']],
  // [['бідний'], ['бідніший']],
  // [['яскраво'], ['яскравіший']],
  // [['щільний'], ['щільніший']],
  // [['цінний'], ['цінніший']],
  // [['холодний'], ['холодніший']],
  // [['тісний'], ['тісніший']],
  // [['тривалий'], ['триваліший']],
  // [['точний'], ['точніший']],
  // [['тихий'], ['тихіший']],
  // [['тендітний'], ['тендітніший']],
  // [['темний'], ['темніший']],
  // [['талановитий'], ['талановитіший']],
  // [['старий'], ['старіший']],
  // [['стабільний'], ['стабільніший']],
  // [['сміливий'], ['сміливіший']],
  // [['складний'], ['складніший']],
  // [['ситний'], ['ситніший']],
  // [['сильний'], ['сильніший']],
  // [['свіжий'], ['свіжіший']],
  // [['різноманітний'], ['різноманітніший']],
  // [['приступно'], ['приступніший']],
  // [['принципово'], ['принциповіший']],
  // [['потужно'], ['потужніший']],
  // [['потрібно'], ['потрібніший']],
  // [['ориґінально'], ['ориґінальніший']],
  // [['міцно'], ['міцніший']],
  // [['мило'], ['миліший']],
  // [['масово'], ['масовіший']],
  // [['крупно'], ['крупніший']],
  // [['конкретно'], ['конкретніший']],
  // [['значний'], ['значніший']],
  // [['досконалий'], ['досконаліший']],
  // [['досвідчений'], ['досвідченіший']],
  // [['глобально'], ['глобальніший']],
  // [['витончений'], ['витонченіший']],
  // [['вигідний'], ['вигідніший']],
  // [['важний'], ['важніший']],
  // [['важливо'], ['важливіший']],
  // [['блідий'], ['блідіший']],
  // [['благородний'], ['благородніший']],
]
