<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2328;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#1b3a6b;color:#ffffff;padding:20px 24px;">
      <strong style="font-size:18px;">OrgConnect</strong>
    </div>
    <div style="padding:24px;line-height:1.55;">
      <p>Hi {{ $president ?? 'there' }},</p>

      @if ($approved)
        <p><strong>{{ $org->name }}</strong> ({{ $org->short_name }}) is now live on OrgConnect, and you are its <strong>President</strong>.</p>
        @if ($note)
          <p style="padding:12px 14px;background:#eef4fb;border-radius:8px;"><strong>Message from the admin:</strong><br>{{ $note }}</p>
        @endif
        <p style="margin-bottom:6px;"><strong>Your organization's details</strong></p>
        <table style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#5e6b78;">College</td><td>{{ $org->college }}</td></tr>
          @if ($org->adviser)<tr><td style="padding:4px 12px 4px 0;color:#5e6b78;">Adviser</td><td>{{ $org->adviser }}</td></tr>@endif
          @if ($org->email)<tr><td style="padding:4px 12px 4px 0;color:#5e6b78;">Email</td><td>{{ $org->email }}</td></tr>@endif
          @if ($org->office)<tr><td style="padding:4px 12px 4px 0;color:#5e6b78;">Office</td><td>{{ $org->office }}</td></tr>@endif
          <tr><td style="padding:4px 12px 4px 0;color:#5e6b78;">Courses</td><td>{{ implode(', ', $org->courses ?? []) }}</td></tr>
        </table>
        <p><strong>Next steps:</strong> sign in, add your officers on Members &amp; Hours, upload your logo on Profile, and post your first event.</p>
      @else
        <p>Your request to register <strong>{{ $org->name }}</strong> ({{ $org->short_name }}) was not approved.</p>
        <p style="padding:12px 14px;background:#fdf1f1;border-radius:8px;"><strong>Reason:</strong><br>{{ $note }}</p>
        <p>You can fix the details and send a new request from OrgConnect.</p>
      @endif

      <p><a href="{{ $appUrl }}" style="display:inline-block;padding:10px 18px;background:#1b3a6b;color:#ffffff;border-radius:8px;text-decoration:none;">Open OrgConnect</a></p>
      <p style="color:#5e6b78;font-size:13px;">The OrgConnect team</p>
    </div>
  </div>
</body>
</html>
