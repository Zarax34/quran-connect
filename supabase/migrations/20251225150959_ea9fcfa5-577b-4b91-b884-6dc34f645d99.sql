-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Centers are viewable by authenticated users" ON public.centers;

CREATE POLICY "Centers are viewable by all"
ON public.centers
FOR SELECT
USING (true);