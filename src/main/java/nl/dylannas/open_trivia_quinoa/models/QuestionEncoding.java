package nl.dylannas.open_trivia_quinoa.models;

public enum QuestionEncoding {
    URL_LEGACY,
    URL_3986,
    BASE64;

    public nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionEncoding toApiType(){
        return switch(this){
            case URL_LEGACY -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionEncoding.URL_LEGACY;
            case URL_3986 -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionEncoding.URL_3986;
            case BASE64 -> nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionEncoding.BASE64;
        };
    }
}
