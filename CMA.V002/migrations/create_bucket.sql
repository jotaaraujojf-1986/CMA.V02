-- Create attachments bucket
insert into storage.buckets (id, name, public) 
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- RLS for attachments bucket
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'attachments' );

create policy "Auth Insert" 
on storage.objects for insert 
with check ( bucket_id = 'attachments' and auth.role() = 'authenticated' );
