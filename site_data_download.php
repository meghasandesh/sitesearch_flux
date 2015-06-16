<!doctype html>
<html>
    <head>
        <script src="//cdnjs.cloudflare.com/ajax/libs/less.js/2.1.0/less.min.js"></script>
        <script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>
        <script src="js/jquery.multi-select.js"></script>
        <script type="text/javascript" src="js/jquery.multidownload.js"></script>
        <link rel="stylesheet" href="css/multi-select.css" media="screen" rel="stylesheet" type="text/css">
    </head>
    <body>
        <section class="str-data-download">
            <h1>Data Download</h1>
            <p><a href="#">Level 2</a> data is available from this page. For other data products, please visit the <a href="#">AmeriFlux data archive</a>.</p>
            <ul>
                <li>Select sites below, enter your intended use and click Download All Files.
                    <br>
                    <b>Note:</b> Your download will be faster if you only choose the sites you need.
                </li>
                <li>
                    When files are download, your contact information, intended use and list of data files will be automatically shared with the tower PI by email.
                </li>
                <li>
                    For each site selected, data for all years for that site will be downloaded. This is for overall efficiency.
                </li>
                <li>
                    To see which sites have data for which years, see <a href="">Data Availability</a>.
                </li>
            </ul>
            <?php
                    $files = $_POST['files'][0];
                    $fileList = explode(",", $files);
                    $download_url = $_POST['download_url'];
                    $file_suffix = $_POST['file_suffix'];
                    
                    echo "<select multiple=\"multiple\" id=\"download-select\" name=\"my-select\">";
                    foreach($fileList as $file) {
                        $filePath = $download_url.$file.$file_suffix;
                        $file_exists = @get_headers($filePath);      
                        if(strpos($file_exists[0], "200") !== false) {
                            echo "<option value=".$file." href=\"".$filePath."\" class=\"link\">".$file."</option>";
                        }
                    }    
                    
                    echo "</select>";
                
            ?>
             
            <div>
                <span>Intended Use</span>
                <select class="intended-use-options">
                    <option value="0" disabled selected style='display:none;'>Choose</option>
                    <option value="1">Academic</option>
                    <option value="2">Commercial</option>
                    <option value="3">Other</option>
                </select>
            </div>
            <div>
                <span>Description</span>
                <textarea class="intended-use-desc">
        
                </textarea>
            </div>
            <p>By clicking Download All Files, I acknowledge that I have read and agree to the <a href="">AmeriFlux Data Policy</a></p>
            <button class="download-all-btn">Download All Files</button>
        </section>
        <script src="js/data-download.js"></script>
    </body>
</html>   