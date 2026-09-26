import mongoose, { Document, Schema } from "mongoose";

export interface IKit extends Document {
  userId: mongoose.Types.ObjectId;

  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };

  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };

  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Array<{
      id: string;
      text: string;
      kind: "technical" | "behavioural" | "domain";
      priority: "must" | "nice";
    }>;
  };

  questions: Array<{
    id: string;
    requirement_ids: string[];
    category:
      | "technical"
      | "behavioural"
      | "system-design"
      | "company-fit";
    prompt: string;
    answer_outline: string;
    difficulty: number;

    // Builder state
    edited?: boolean;
    pinned?: boolean;
  }>;

  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    requirement_ids: string[];

    // Builder state
    edited?: boolean;
    pinned?: boolean;

    // Practice state
    confidence?: number | null;
    covered?: boolean;
  }>;

  schedule: {
    days_available: number;
    days: Array<{
      day: number;
      focus: string;
      question_ids: string[];
      minutes: number;
    }>;
  };

  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const requirementSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    kind: {
      type: String,
      enum: ["technical", "behavioural", "domain"],
      required: true,
    },

    priority: {
      type: String,
      enum: ["must", "nice"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const questionSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    requirement_ids: {
      type: [String],
      default: [],
    },

    category: {
      type: String,
      enum: [
        "technical",
        "behavioural",
        "system-design",
        "company-fit",
      ],
      required: true,
    },

    prompt: {
      type: String,
      required: true,
    },

    answer_outline: {
      type: String,
      required: true,
    },

    difficulty: {
      type: Number,
      min: 1,
      max: 3,
      required: true,
    },

    // User manually edited this question
    edited: {
      type: Boolean,
      default: false,
    },

    // Regeneration must preserve this question
    pinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const flashcardSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    front: {
      type: String,
      required: true,
    },

    back: {
      type: String,
      required: true,
    },

    requirement_ids: {
      type: [String],
      default: [],
    },

    // User manually edited this flashcard
    edited: {
      type: Boolean,
      default: false,
    },

    // Regeneration must preserve this flashcard
    pinned: {
      type: Boolean,
      default: false,
    },

    // Practice confidence: 1 = lowest, 5 = highest
    confidence: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // True after the user has practiced this flashcard
    covered: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const scheduleDaySchema = new Schema(
  {
    day: {
      type: Number,
      required: true,
    },

    focus: {
      type: String,
      required: true,
    },

    question_ids: {
      type: [String],
      default: [],
    },

    minutes: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const kitSchema = new Schema<IKit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      company: {
        type: String,
        required: true,
      },

      company_url: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        required: true,
      },

      location: {
        type: String,
        required: true,
      },

      jd_chars: {
        type: Number,
        required: true,
      },

      researched_at: {
        type: String,
        required: true,
      },

      pages_used: {
        type: [String],
        default: [],
      },
    },

    company_brief: {
      summary: {
        type: String,
        required: true,
      },

      what_they_do: {
        type: String,
        required: true,
      },

      sources: {
        type: [String],
        default: [],
      },
    },

    role: {
      title: {
        type: String,
        required: true,
      },

      seniority: {
        type: String,
        required: true,
      },

      responsibilities: {
        type: [String],
        default: [],
      },

      requirements: {
        type: [requirementSchema],
        default: [],
      },
    },

    questions: {
      type: [questionSchema],
      default: [],
    },

    flashcards: {
      type: [flashcardSchema],
      default: [],
    },

    schedule: {
      days_available: {
        type: Number,
        required: true,
      },

      days: {
        type: [scheduleDaySchema],
        default: [],
      },
    },

    coverage: {
      uncovered_requirement_ids: {
        type: [String],
        default: [],
      },

      passes: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const Kit = mongoose.model<IKit>("Kit", kitSchema);