-- Private storage bucket for cleaned Redsys operations exports.
-- Files are generated and uploaded by server-side admin route handlers.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'redsys-operations',
  'redsys-operations',
  false,
  10485760,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
