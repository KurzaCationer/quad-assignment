package nl.dylannas.open_trivia_quinoa.models;

public enum QuestionDifficulty {
    EASY,
    MEDIUM,
    HARD;

    public nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionDifficulty toApiType(){
        return switch(this){
            case EASY -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionDifficulty.EASY;
            case MEDIUM -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionDifficulty.MEDIUM;
            case HARD -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionDifficulty.HARD;
        };
    }
}
