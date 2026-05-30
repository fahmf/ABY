import type { DictionaryEntry, Lesson, Unit, Volume } from "./types";

// Data seed untuk pengembangan Fase 1 (sebelum Supabase tersambung).
// Teks contoh ditulis sederhana untuk demonstrasi reader & kamus.

export const VOLUMES: Volume[] = [
  { number: 1, title_ar: "الكتاب الأول", slug: "1" },
];

export const UNITS: Unit[] = [
  {
    slug: "tahiyya-wa-taaruf",
    volumeNumber: 1,
    number: 1,
    title_ar: "التحية والتعارف",
  },
  {
    slug: "al-usra",
    volumeNumber: 1,
    number: 2,
    title_ar: "الأسرة",
  },
];

export const LESSONS: Lesson[] = [
  {
    slug: "as-salamu-alaykum",
    unitSlug: "tahiyya-wa-taaruf",
    volumeNumber: 1,
    title_ar: "السلام عليكم",
    body_ar:
      "السَّلامُ عَلَيْكُمْ. وَعَلَيْكُمُ السَّلامُ وَرَحْمَةُ اللَّهِ. كَيْفَ حالُكَ؟ أَنا بِخَيْرٍ، الحَمْدُ لِلَّهِ. ما اسْمُكَ؟ اسْمي خالِدٌ، وَأَنا طالِبٌ في الجامِعَةِ. أَهْلاً وَسَهْلاً بِكَ يا خالِدُ.",
  },
  {
    slug: "min-ayna-anta",
    unitSlug: "tahiyya-wa-taaruf",
    volumeNumber: 1,
    title_ar: "من أين أنت؟",
    body_ar:
      "مِنْ أَيْنَ أَنْتَ؟ أَنا مِنْ مِصْرَ. وَأَنْتَ؟ أَنا مِنَ السُّعودِيَّةِ. هَلْ أَنْتَ طالِبٌ جَديدٌ؟ نَعَمْ، أَنا طالِبٌ جَديدٌ في هذِهِ الجامِعَةِ. مَرْحَباً بِكَ بَيْنَ إِخْوانِكَ.",
  },
  {
    slug: "usrati",
    unitSlug: "al-usra",
    volumeNumber: 1,
    title_ar: "أسرتي",
    body_ar:
      "هذِهِ أُسْرَتي. أَبي مُدَرِّسٌ، وَأُمّي طَبيبَةٌ. لي أَخٌ كَبيرٌ وَأُخْتٌ صَغيرَةٌ. نَحْنُ نَسْكُنُ في بَيْتٍ كَبيرٍ قَريبٍ مِنَ المَدْرَسَةِ. أُحِبُّ أُسْرَتي حُبّاً كَثيراً.",
  },
];

// Kamus seed — diindeks oleh bentuk lemma yang dinormalkan saat dimuat.
export const DICTIONARY: DictionaryEntry[] = [
  {
    lemma_ar: "سلام",
    root_ar: "س ل م",
    meaning_ar: "الأمانُ والتحيّةُ، وهو من أسماء الله الحُسنى.",
    synonyms_ar: ["أمان", "تحيّة"],
    antonyms_ar: ["حرب", "خصام"],
    examples_ar: ["أَلقى عليه السَّلامَ.", "السَّلامُ خيرٌ من الخصام."],
  },
  {
    lemma_ar: "حال",
    root_ar: "ح و ل",
    meaning_ar: "ما عليه الإنسانُ من خيرٍ أو شرٍّ وصفةٍ.",
    synonyms_ar: ["وضع", "شأن"],
    antonyms_ar: [],
    examples_ar: ["كيف حالُك اليوم؟"],
  },
  {
    lemma_ar: "اسم",
    root_ar: "س م و",
    meaning_ar: "لفظٌ يُعرَفُ به الشيءُ ويُميَّزُ عن غيره.",
    synonyms_ar: ["لقب", "تسمية"],
    antonyms_ar: [],
    examples_ar: ["ما اسمُك؟", "كتبَ اسمَه على الدفتر."],
  },
  {
    lemma_ar: "طالب",
    root_ar: "ط ل ب",
    meaning_ar: "مَن يَطلُبُ العِلمَ في مدرسةٍ أو جامعةٍ.",
    synonyms_ar: ["تلميذ", "دارس"],
    antonyms_ar: ["مدرّس", "أستاذ"],
    examples_ar: ["الطالبُ المجتهدُ يَنجَحُ.", "أنا طالبٌ في الجامعة."],
  },
  {
    lemma_ar: "جامعة",
    root_ar: "ج م ع",
    meaning_ar: "مؤسّسةٌ تعليميّةٌ عُليا تَجمَعُ كلّيّاتٍ متعدّدة.",
    synonyms_ar: ["كلّيّة"],
    antonyms_ar: [],
    examples_ar: ["يدرُسُ في الجامعةِ.", "الجامعةُ تَجمَعُ الطلابَ."],
  },
  {
    lemma_ar: "بيت",
    root_ar: "ب ي ت",
    meaning_ar: "المسكنُ الذي يأوي إليه الإنسانُ وأهلُه.",
    synonyms_ar: ["منزل", "دار", "مسكن"],
    antonyms_ar: [],
    examples_ar: ["نسكنُ في بيتٍ كبيرٍ.", "عادَ إلى بيتِه."],
  },
  {
    lemma_ar: "أسرة",
    root_ar: "أ س ر",
    meaning_ar: "الجماعةُ من الأقاربِ يَربِطُها نسبٌ أو زواجٌ.",
    synonyms_ar: ["عائلة", "أهل"],
    antonyms_ar: [],
    examples_ar: ["أُحبُّ أُسرتي.", "الأسرةُ أساسُ المجتمعِ."],
  },
  {
    lemma_ar: "مدرسة",
    root_ar: "د ر س",
    meaning_ar: "مكانٌ يَتعلَّمُ فيه الطلابُ على أيدي المدرّسين.",
    synonyms_ar: ["مَعهد"],
    antonyms_ar: [],
    examples_ar: ["ذهبَ إلى المدرسةِ.", "المدرسةُ قريبةٌ من البيتِ."],
  },
  {
    lemma_ar: "كبير",
    root_ar: "ك ب ر",
    meaning_ar: "ما عَظُمَ حجمُه أو سِنُّه أو قَدْرُه.",
    synonyms_ar: ["عظيم", "ضخم"],
    antonyms_ar: ["صغير"],
    examples_ar: ["بيتٌ كبيرٌ.", "أخي الكبيرُ يساعدُني."],
  },
  {
    lemma_ar: "صغير",
    root_ar: "ص غ ر",
    meaning_ar: "ما قَلَّ حجمُه أو سِنُّه.",
    synonyms_ar: ["دقيق"],
    antonyms_ar: ["كبير"],
    examples_ar: ["أختي الصغيرةُ تلعبُ.", "كتابٌ صغيرٌ."],
  },
];
