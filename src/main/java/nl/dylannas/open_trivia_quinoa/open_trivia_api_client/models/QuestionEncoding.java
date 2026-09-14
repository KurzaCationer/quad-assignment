package nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models;

import com.fasterxml.jackson.annotation.JsonValue;

public enum QuestionEncoding {
    URL_LEGACY("urlLegacy"),
    URL_3986("url3986"),
    BASE64("base64");

    private final String apiValue;

    QuestionEncoding(String apiValue) {
        this.apiValue = apiValue;
    }

    @Override
    @JsonValue
    public String toString() {
        return this.apiValue;
    }

    public nl.dylannas.open_trivia_quinoa.models.QuestionEncoding toModelType(){
        return switch(this){
            case BASE64 -> nl.dylannas.open_trivia_quinoa.models.QuestionEncoding.BASE64;
            case URL_LEGACY -> nl.dylannas.open_trivia_quinoa.models.QuestionEncoding.URL_LEGACY;
            case URL_3986 -> nl.dylannas.open_trivia_quinoa.models.QuestionEncoding.URL_3986;
        };
    }
}
