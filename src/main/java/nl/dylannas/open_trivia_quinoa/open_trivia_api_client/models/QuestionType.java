package nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models;

import com.fasterxml.jackson.annotation.JsonValue;

public enum QuestionType {
    MULTIPLE("multiple"),
    BOOLEAN_TYPE("boolean");

    private final String apiValue;

    QuestionType(String apiValue) {
        this.apiValue = apiValue;
    }

    @Override
    @JsonValue
    public String toString() {
        return this.apiValue;
    }

    public nl.dylannas.open_trivia_quinoa.models.QuestionType toModelType(){
        return switch(this){
            case MULTIPLE -> nl.dylannas.open_trivia_quinoa.models.QuestionType.MULTIPLE;
            case BOOLEAN_TYPE -> nl.dylannas.open_trivia_quinoa.models.QuestionType.BOOLEAN_TYPE;
        };
    }
}
