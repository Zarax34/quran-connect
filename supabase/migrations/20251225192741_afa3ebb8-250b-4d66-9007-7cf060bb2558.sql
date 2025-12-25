-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for center logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('center-logos', 'center-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access for student photos
CREATE POLICY "Student photos are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'student-photos');

-- Allow authenticated users to upload student photos
CREATE POLICY "Authenticated users can upload student photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'student-photos');

-- Allow authenticated users to update student photos
CREATE POLICY "Authenticated users can update student photos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'student-photos');

-- Allow authenticated users to delete student photos
CREATE POLICY "Authenticated users can delete student photos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'student-photos');

-- Allow public read access for center logos
CREATE POLICY "Center logos are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'center-logos');

-- Allow authenticated users to upload center logos
CREATE POLICY "Authenticated users can upload center logos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'center-logos');

-- Allow authenticated users to update center logos
CREATE POLICY "Authenticated users can update center logos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'center-logos');

-- Allow authenticated users to delete center logos
CREATE POLICY "Authenticated users can delete center logos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'center-logos');