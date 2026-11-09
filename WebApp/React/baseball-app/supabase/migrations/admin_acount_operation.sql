--管理者の追加--
INSERT INTO public.club_admins (email) 
VALUES ('new-admin@example.com');

--管理者の削除--
DELETE FROM public.club_admins 
WHERE email = 'komesouta@gmail.com';

--管理者リストの確認--
