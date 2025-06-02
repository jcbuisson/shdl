import { StreamLanguage, StringStream } from '@codemirror/language'; // Import StreamLanguage and StringStream


const myLangStreamParser = {
  // Define keywords and their corresponding CSS class names (which map to CodeMirror's highlight tags)
  // These will be prefixed with 'cm-mylang-' internally by CodeMirror
  keywords: ["module", "end", "on", "reset", "output", "enabled"],
  // This 'token' method is the heart of your custom highlighter
  token: (stream /*: StringStream*/, state /*: any*/) => {
    // Check for comments
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment"; // 'comment' is a standard CodeMirror highlight tag
    }

    // Check for strings
    if (stream.peek() === '"') {
      stream.next(); // Consume the opening quote
      while (!stream.eol() && stream.peek() !== '"') {
        stream.next();
      }
      if (stream.peek() === '"') {
        stream.next(); // Consume the closing quote
      }
      return "string"; // 'string' is a standard CodeMirror highlight tag
    }

    // Check for numbers
    if (/\d/.test(stream.peek())) {
      stream.eatWhile(/\d/);
      return "number"; // 'number' is a standard CodeMirror highlight tag
    }

    // Check for keywords
    for (let i = 0; i < myLangStreamParser.keywords.length; i++) {
      const keyword = myLangStreamParser.keywords[i];
      if (stream.match(keyword)) {
        return "keyword"; // 'keyword' is a standard CodeMirror highlight tag
      }
    }

    // If nothing else matched, consume the next character and return null (no highlighting)
    stream.next();
    return null;
  },
  startState: () => ({}), // Simple state for this example
  copyState: (state) => ({ ...state }),
};

// Wrap your parser in StreamLanguage to create a CodeMirror language extension
export const myLang = StreamLanguage.define(myLangStreamParser);
