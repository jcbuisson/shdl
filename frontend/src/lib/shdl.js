import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { parser } from "/src/grammar/shdl-parser"

export const myLang = LRLanguage.define({
  parser: parser
});

export function myLangSupport() {
  console.log("creating myLangSupport...")
  return new LanguageSupport(myLang, []);
}
