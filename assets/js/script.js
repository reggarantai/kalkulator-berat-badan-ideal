// Author: Regga @reggarantai
// https://regga.id/coding/

$(document).ready(function(){

  var tinggi = $('#tinggi').val();

  // Deteksi jika input tinggi selesai diketik
  $('#tinggi').keyup(function(){
    tinggi = $('#tinggi').val();
    validate({
      tinggi: parseInt(tinggi),
      gender: $('#gender1').is(':checked') ? true : false,
      formula: $('#formula').val()
    });

  });


  // Deteksi jika perubahan nilai input
  $('#tinggi, #gender input, #formula').change(function(){

    // Untuk menghindari dobel proses karena pengaruh keyup, maka perlu diset kondisi
    var change = true,
    tinggiSaatIni = $('#tinggi').val();
    if($(this).attr('id') == 'tinggi' && tinggiSaatIni == tinggi) {
      change = false;
    }
    if(change){
      validate({
        tinggi: parseInt(tinggiSaatIni),
        gender: $('#gender1').is(':checked') ? true : false,
        formula: $('#formula').val()
      });
    }
  });

});

// Deteksi apakah user input tinggi badan & nilai nya lebih dari 80 cm
function validate(obj){
  $('#tinggi').val() > 80 ? hitung(obj) : $('#hasil').html('').hide();
}

// Mulai penghitungan
function hitung(obj){
  $('#hasil').hide();
  var hasil,
  isBMI = obj.formula == 'BMI range formula' ? true : false,
  isHamwi = obj.formula == 'Hamwi formula' ? true : false;

  // Cek formula yang dipilih
  switch (obj.formula) {
    case 'BMI range formula':
      hasil = bmi(obj);
      break;
      case 'Devine formula':
        hasil = devine(obj);
        break;
        case 'Robinson formula':
          hasil = robinson(obj);
          break;
          case 'Miller formula':
            hasil = miller(obj);
            break;
            case 'Hamwi formula':
              hasil = hamwi(obj);
              break;
              case 'Lemmens formula':
                hasil = lemmens(obj);
                break;
                case 'Broca formula':
                  hasil = broca(obj);
                  break;
                  case 'semua':
                    hasil = 'semua';
                    break;
    default:
    hasil = false;
  }

  if(hasil){
    // Jika tampilkan semua formula
    if(hasil == 'semua'){
      var htmlToAppend = '';
      $('#formula option').each(function(){
        var formula = $(this).val(),
        isBMIEach = formula == 'BMI range formula' ? true : false,
        isHamwiEach = formula == 'Hamwi formula' ? true : false,
        hasilEach;

        if(formula != 'semua'){
          switch (formula) {
            case 'BMI range formula':
              hasilEach = bmi(obj);
              break;
              case 'Devine formula':
                hasilEach = devine(obj);
                break;
                case 'Robinson formula':
                  hasilEach = robinson(obj);
                  break;
                  case 'Miller formula':
                    hasilEach = miller(obj);
                    break;
                    case 'Hamwi formula':
                      hasilEach = hamwi(obj);
                      break;
                      case 'Lemmens formula':
                        hasilEach = lemmens(obj);
                        break;

            default:
            hasilEach = broca(obj);
          }

          htmlToAppend += '<div class="bg-info text-white"><p>Berdasarkan ' + formula + '</p><h5>'
          + 'Berat idealnya kamu adalah ' + ( isBMIEach ? '<br>antara ' : '' ) + '<strong>' + (isHamwiEach ? hasilEach.toFixed(2).toString() : hasilEach.toString()) + '</strong> Kg</h5>'
          + ( isHamwiEach ? '<hr><p>Jika lingkar pergelangan tanganmu dibawah 17,78 Cm maka berat idealmu adalah <strong>'
          + ( (hasilEach - (hasilEach * 0.1)).toFixed(2).toString() ) + '</strong> Kg dan jika diatas 17,78 Cm maka berat idealmu adalah <strong>'
          + ( (hasilEach + (hasilEach * 0.1)).toFixed(2).toString() ) + '</strong> Kg</p>' : '')
          + '</div>';
        }
      });

      // Tampilkan semua hasil formula
      $('#hasil').html(htmlToAppend).fadeIn();

    }else{
      // Tampilkan hasil salah satu formula saja
      $('#hasil').html(
        '<div class="bg-info text-white"><p>Berdasarkan ' + obj.formula + '</p><h5>'
        + 'Berat idealnya kamu adalah ' + ( isBMI ? '<br>antara ' : '' ) + '<strong>' + (isHamwi ? hasil.toFixed(2).toString() : hasil.toString()) + '</strong> Kg</h5>'
        + ( isHamwi ? '<hr><p>Jika lingkar pergelangan tanganmu dibawah 17,78 Cm maka berat idealmu adalah <strong>'
        + ( (hasil - (hasil * 0.1)).toFixed(2).toString() ) + '</strong> Kg dan jika diatas 17,78 Cm maka berat idealmu adalah <strong>'
        + ( (hasil + (hasil * 0.1)).toFixed(2).toString() ) + '</strong> Kg</p>' : '')
        + '</div>'
      ).fadeIn();
    }
  }

}

// BMI range formula
function bmi(obj){
  var beratMinimal = Math.pow( (obj.tinggi/100), 2 ) * 18.5,
  beratMaksimal = Math.pow( (obj.tinggi/100), 2 ) * 24.999999;
  return beratMinimal.toFixed(2) + '</strong> Kg sampai <strong>' + beratMaksimal.toFixed(2);
}

// Broca formula
function broca(obj){
  var normal = (parseInt(obj.tinggi) - 100);
  return (normal - (normal * (obj.gender ? 0.1 : 0.15))).toFixed(2);
}

// Devine formula
function devine(obj){
  var inch = obj.tinggi / 2.54,
  baseWeight = obj.gender ? 50 : 45.5,
  baseFeet = 12 * 5,
  inchOver5Feet = (inch > baseFeet ? inch - baseFeet : 0);
  return (baseWeight + (inchOver5Feet * 2.3)).toFixed(2);
}

// Robinson formula
function robinson(obj){
  var inch = obj.tinggi / 2.54,
  baseWeight = obj.gender ? 52 : 49,
  baseFeet = 12 * 5,
  inchOver5Feet = (inch > baseFeet ? inch - baseFeet : 0);
  return (baseWeight + (inchOver5Feet * (obj.gender ? 1.9 : 1.7))).toFixed(2);
}

// Miller formula
function miller(obj){
  var inch = obj.tinggi / 2.54,
  baseWeight = obj.gender ? 56.2 : 53.1,
  baseFeet = 12 * 5,
  inchOver5Feet = (inch > baseFeet ? inch - baseFeet : 0);
  return (baseWeight + (inchOver5Feet * (obj.gender ? 1.41 : 1.36))).toFixed(2);
}

// Hamwi formula
function hamwi(obj){
  var inch = obj.tinggi / 2.54,
  baseWeight = obj.gender ? 106 : 100,
  baseFeet = 12 * 5,
  inchOver5Feet = (inch > baseFeet ? inch - baseFeet : 0),
  lb = baseWeight + (inchOver5Feet * (obj.gender ? 6 : 5));
  return lb*0.45359233;

}

// Lemmens formula
function lemmens(obj){
  return (22 * Math.pow( (obj.tinggi/100), 2 )).toFixed(2);
}
