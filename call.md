---
layout: default
title: Call a provider
---

<nav class="navbar navbar-expand-lg fixed-top" id="mainNav">
  <div class="container">
    <a class="navbar-brand js-scroll-trigger" href="/">
      <img class="wordmark" height="20px" src="/assets/img/pin.png"/>
      FindYourVaccine<span class="org">.org</span>
    </a>
  </div>
</nav>

<div class="container state-holder">
  <div class="row">
    <div class="col-sm">
      <h3 id="name"></h3>
      <h2 id="phone"></h2><br />
      <h6 id="contacted"></h6><br />
      <button id="no-answer" class="btn btn-primary btn-sm" onclick="window.location.reload();">No answer? Go to next provider</button><br /><br />
      <h5 id="website"></h5>
      <h6 id="address"></h6>
      <br /><br />
      <a id="wrong-info" target="_blank"><button class="btn btn-secondary">Report incorrect provider info</button></a><br />
    </div>
    <div class="col-sm">
      <div id="iframe-holder"></div>
    </div>
  </div>
</div>

<div id="modal" class="modal" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
    <div class="modal-content">
      <center>
      <div class="modal-body">
        <div id="modal-text">
          <br /><strong>Sorry, we don't recognize that URL. Please double-check the link emailed to you!</strong><br /><br />
          Forgot your URL? Resend the link:<br />
          <input type="text" id="email" name="email" placeholder="Your email address">
          <button id="resend" class="btn btn-sm btn-primary" onclick="resend();">Resend link</button>
        </div>
        <br /><button id="modal-cta" type="button" class="btn btn-primary" data-dismiss="modal" onclick="redirect();">Call another provider</button>
      </div>
      </center>
    </div>
  </div>
</div>

<script>
const ctas = [
  "Nice.",
  "Woohoo!",
  "Great job.",
  "Thank you!",
  "Wonderful."
];

const callRegex = /calls\=[0-9]/g;
const stateRegex = /state\=[A-Z]/g;

const urlParams = new URLSearchParams(window.location.search);
var url = window.location.href;

function redirect() {
  window.location.replace(url);
}

function resend() {
  var email = $("#email").val();
  var resendBtn = $("#resend");
  resendBtn.text("Sending...");
  resendBtn.prop('disabled', true);
  $.ajax({
    url: `https://85wa3k3bl5.execute-api.us-east-2.amazonaws.com/default/sendVolunteerURL?email=${email}`,
    type: "GET",
    success: function (data) { resendBtn.text("Sent!"); }
  });
}

$(document).ready(function () {
  const ID = urlParams.get('id');
  const STATES = urlParams.get('states');
  const CALLS = urlParams.get('calls');

  var lambdaUrl = `https://rpy77zbl3f.execute-api.us-east-2.amazonaws.com/default/getProvider?id=${ID}`;
  if (STATES) { lambdaUrl += `&states=${STATES}`; }

  $.ajax({
    url: lambdaUrl,
    type: "GET",
    success: function (data) {
      if (data == null) {
        $('#modal-cta').hide();
        $('#modal').modal({backdrop: 'static'});
        return;
      }

      // Add provider details
      $("#name").text(data['Name']);
      $("#phone").text("Call: " + data['Phone']);
      if (data['Website']) {
        $("#website").html(`<a target="_blank" href="${data['Website']}">Provider website</a>`);
      }
      $("#address").text(data['Address']);
      $("#contacted").text("Last contacted: " + data['Last Contacted']);

      // Parse hidden fields into prefilled forms
      $("#wrong-info").attr('href', `https://airtable.com/shrzDS45VGDFjuZpE?prefill_Name=${data['Name']}&prefill_Phone=${data['Phone']}&prefill_Address=${data['Address']}&prefill_Website=${data['Website']}`)

      $("#wrong-info").show();
      $("#no-answer").show();

      var prefills = `prefill_Location=${data['Name']}&prefill_Caller=${data['Caller']}`;

      // Add iframe to the page
      const frame = `<iframe id="iframe" class="airtable-embed" src="https://app.miniextensions.com/form/wLnwdAmMKlp6nzJrXabw?${prefills}" frameborder="0" onmousewheel="" width="100%" height="1800px" style="background: transparent; border: 1px solid #ccc;"></iframe>`;
      $(frame).appendTo('#iframe-holder');

      var iloads = 0;
      $("#iframe").on('load', function() {
        iloads++;
        callsMade = 1;
        if (iloads > 1) {
          if (CALLS) {
            callsMade = parseInt(CALLS) + 1;
            url = url.replace(callRegex, 'calls='+callsMade);
          } else {
            url += '&calls=1';
          }
          var cta = ctas[Math.floor(Math.random()*ctas.length)];
          cta += ` You've made ${callsMade} call`
          if (callsMade > 1) { cta += 's'; }
          cta += " so far. Keep up the good work!";
          $('#modal-text').html(cta);
          $('#modal').modal({backdrop: 'static'});
        }
      });

    }
  });
});
</script>