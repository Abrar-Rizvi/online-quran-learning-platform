export interface FaqItem {
  question: string;
  answer: string;
}

/** Academy-authored FAQ content, verbatim from the academy's FAQ PDF — do not reword. Single source for every place FAQs are shown. */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "How do online Quran classes work?",
    answer:
      "Each class is a live, one-to-one lesson between the student and teacher, conducted via Zoom or Microsoft Teams. The teacher shares the lesson on screen, listens to the student read, and corrects them in real time.",
  },
  {
    question: "What does my child need to join?",
    answer:
      "A laptop, tablet, or phone, headphones if possible, a stable internet connection, and a quiet place to study. You don't need to buy any books to get started.",
  },
  {
    question: "Are the free trial classes really free?",
    answer:
      "Yes. Trial classes are completely free, with no credit card required and no commitment. They allow the student to meet the teacher and help us assess their level so we can place them in the right course.",
  },
  {
    question: "Do you have female teachers?",
    answer:
      "Yes. You can choose a male or female teacher when you register or book a trial. Female teachers are available for girls and women.",
  },
  {
    question: "Which time zones do you teach in?",
    answer:
      "Classes are scheduled across all US time zones, as well as Canada and the UK. Early mornings, after-school hours, evenings, and weekends are available.",
  },
  {
    question: "How much do the classes cost?",
    answer:
      "Our monthly plans include 3 days a week for $45, 5 days a week for $60, and a weekend program for $32. All plans include 30-minute, one-to-one classes with no registration fee.",
  },
  {
    question: "How do I pay?",
    answer:
      "Your monthly invoice appears in the dashboard along with payment instructions. After making the payment, you can upload a photo or PDF of the receipt for confirmation.",
  },
  {
    question: "Can I enroll more than one child?",
    answer:
      "Yes. One parent account can include multiple children. Each child can have their own course, plan, teacher, and schedule.",
  },
  {
    question: "What if we miss a class?",
    answer:
      "Parents should inform the teacher at least 3 hours in advance, and the academy will try to reschedule the missed class.",
  },
  {
    question: "How will I know my child is making progress?",
    answer:
      "Teachers record attendance and lesson notes after each class. A monthly assessment includes the lesson reached, grade, and teacher's remarks. All progress information is visible in the parent dashboard.",
  },
];
