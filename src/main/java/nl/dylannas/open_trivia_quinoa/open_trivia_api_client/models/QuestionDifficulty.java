package nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models;

import com.fasterxml.jackson.annotation.JsonValue;

public enum QuestionDifficulty {
    EASY("easy"),
    MEDIUM("medium"),
    HARD("hard");

    private final String apiValue;

    QuestionDifficulty(String apiValue) {
        this.apiValue = apiValue;
    }

    @Override
    @JsonValue
    public String toString() {
        return this.apiValue;
    }

    public nl.dylannas.open_trivia_quinoa.models.QuestionDifficulty toModelType(){
        return switch(this){
            case EASY -> nl.dylannas.open_trivia_quinoa.models.QuestionDifficulty.EASY;
            case MEDIUM -> nl.dylannas.open_trivia_quinoa.models.QuestionDifficulty.MEDIUM;
            case HARD -> nl.dylannas.open_trivia_quinoa.models.QuestionDifficulty.HARD;
        };
    }
}
