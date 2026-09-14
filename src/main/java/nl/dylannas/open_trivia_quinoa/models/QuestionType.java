package nl.dylannas.open_trivia_quinoa.models;

public enum QuestionType {
    MULTIPLE,
    BOOLEAN_TYPE;

    public nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionType toApiType(){
        return switch(this){
            case MULTIPLE -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionType.MULTIPLE;
            case BOOLEAN_TYPE -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionType.BOOLEAN_TYPE;
        };
    }
}
