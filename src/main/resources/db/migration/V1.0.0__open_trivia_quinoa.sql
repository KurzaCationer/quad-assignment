
    create table QuestionAndAnswerModel (
        id uuid not null,
        category integer,
        correct_answer varchar(255),
        difficulty smallint check ((difficulty between 0 and 2)),
        incorrect_answers varchar(255) array,
        question varchar(255),
        question_hash TEXT GENERATED ALWAYS AS (md5(question)),
        type smallint check ((type between 0 and 1)),
        primary key (id),
        constraint uk_question_hash unique (question_hash, question)
    );
