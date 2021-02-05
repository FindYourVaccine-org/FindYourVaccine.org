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
      <button class="btn btn-primary btn-sm" onclick="window.location.reload();">No answer? Go to next provider</button><br /><br />
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

<script>
$(document).ready(function () {
  const id = window.location.search.split('=')[1];
  $.ajax({
    type: "GET",
    url: `https://rpy77zbl3f.execute-api.us-east-2.amazonaws.com/default/getProvider?id=${id}`,
    success: function (data) {
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
      var prefills = `prefill_Location=${data['Name']}&prefill_Caller=${data['Caller']}`;

      // Add iframe to the page
      const frame = `<iframe id="iframe" class="airtable-embed" src="https://app.miniextensions.com/form/wLnwdAmMKlp6nzJrXabw?${prefills}" frameborder="0" onmousewheel="" width="100%" height="1600px" style="background: transparent; border: 1px solid #ccc;"></iframe>`;
      $(frame).appendTo('#iframe-holder');

      // $("#iframe").load(function(){
      //   console.log("LOAD");
      // });

    }
  });
});
</script>