// Add source_language to ServerTextData interface
export interface ServerTextData extends ServerTranslationDataBase {
    event: 'translation_text';
    payload: string;
    source_language?: string;  // 💾 ADD SOURCE LANGUAGE
  }