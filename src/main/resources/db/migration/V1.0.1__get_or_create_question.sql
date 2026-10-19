CREATE FUNCTION get_or_create_question(
    p_category integer,
    p_correct_answer text,
    p_difficulty smallint,
    p_incorrect_answers varchar[],
    p_question text,
    p_type smallint
)
RETURNS QuestionAndAnswerModel
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    stored_question QuestionAndAnswerModel%ROWTYPE;
BEGIN
    LOOP
        INSERT INTO QuestionAndAnswerModel (
            id, category, correct_answer, difficulty, incorrect_answers, question, type
        )
        VALUES (
            gen_random_uuid(), p_category, p_correct_answer, p_difficulty,
            p_incorrect_answers, p_question, p_type
        )
        ON CONFLICT ON CONSTRAINT uk_question_hash DO NOTHING
        RETURNING * INTO stored_question;

        IF FOUND THEN
            RETURN stored_question;
        END IF;

        SELECT q.* INTO stored_question
        FROM QuestionAndAnswerModel q
        WHERE q.question_hash = md5(p_question) AND q.question = p_question
        FOR KEY SHARE;

        IF FOUND THEN
            RETURN stored_question;
        END IF;
    END LOOP;
END;
$$;
